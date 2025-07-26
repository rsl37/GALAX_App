/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - KYC Document Verification functionality
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { db } from './database.js';
import { encryptDocument, decryptDocument, hashDocument } from './encryption.js';

// Allowed document types
const ALLOWED_DOCUMENT_TYPES = [
  'passport',
  'drivers_license', 
  'national_id',
  'residence_permit',
  'utility_bill',
  'bank_statement'
];

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Multer configuration for secure file upload
 */
export const kycUpload = multer({
  dest: '/tmp/kyc-uploads/',
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 2 // Main document + selfie
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
    
    // Validate file name (prevent directory traversal)
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Invalid file name.'));
    }
    
    cb(null, true);
  }
});

/**
 * Validates document data before processing
 */
function validateKYCData(documentType: string, documentNumber: string): boolean {
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    return false;
  }
  
  if (!documentNumber || documentNumber.trim().length < 3) {
    return false;
  }
  
  // Basic format validation
  if (documentNumber.length > 50) {
    return false;
  }
  
  return true;
}

/**
 * Securely stores uploaded document with encryption
 */
async function storeEncryptedDocument(filePath: string, userId: number, documentType: string): Promise<string> {
  try {
    // Read file data
    const fileData = fs.readFileSync(filePath);
    
    // Generate unique document ID
    const documentId = `${userId}_${documentType}_${Date.now()}_${randomBytes(8).toString('hex')}`;
    
    // Encrypt document data
    const encryptedData = encryptDocument(fileData, documentId);
    
    // Ensure encrypted documents directory exists
    const encryptedDir = path.join('./data/encrypted_documents');
    if (!fs.existsSync(encryptedDir)) {
      fs.mkdirSync(encryptedDir, { recursive: true });
    }
    
    // Store encrypted file
    const encryptedFilePath = path.join(encryptedDir, `${documentId}.enc`);
    fs.writeFileSync(encryptedFilePath, encryptedData, 'base64');
    
    // Clean up original file
    fs.unlinkSync(filePath);
    
    return encryptedFilePath;
  } catch (error) {
    console.error('❌ Failed to store encrypted document:', error);
    throw new Error('Failed to securely store document');
  }
}

/**
 * Uploads and processes KYC documents
 */
export async function uploadKYCDocuments(
  userId: number, 
  documentType: string, 
  documentNumber: string,
  documentFile: Express.Multer.File,
  selfieFile?: Express.Multer.File
): Promise<{ success: boolean; verificationId?: number; error?: string }> {
  try {
    console.log('📄 Processing KYC document upload for user:', userId);
    
    // Validate input data
    if (!validateKYCData(documentType, documentNumber)) {
      return { success: false, error: 'Invalid document type or number' };
    }
    
    // Check for existing pending verification
    const existingVerification = await db
      .selectFrom('kyc_verifications')
      .select(['id', 'verification_status'])
      .where('user_id', '=', userId)
      .where('verification_status', 'in', ['pending', 'under_review'])
      .executeTakeFirst();
    
    if (existingVerification) {
      return { success: false, error: 'You already have a pending KYC verification' };
    }
    
    // Process and encrypt main document
    const documentHash = hashDocument(fs.readFileSync(documentFile.path));
    const encryptedDocumentPath = await storeEncryptedDocument(documentFile.path, userId, documentType);
    
    // Process selfie if provided
    let selfieHash: string | null = null;
    let encryptedSelfiePath: string | null = null;
    
    if (selfieFile) {
      selfieHash = hashDocument(fs.readFileSync(selfieFile.path));
      encryptedSelfiePath = await storeEncryptedDocument(selfieFile.path, userId, `${documentType}_selfie`);
    }
    
    // Create KYC verification record
    const result = await db
      .insertInto('kyc_verifications')
      .values({
        user_id: userId,
        verification_level: 'basic',
        document_type: documentType,
        document_number: documentNumber,
        document_image_url: encryptedDocumentPath,
        document_hash: documentHash,
        selfie_image_url: encryptedSelfiePath,
        selfie_hash: selfieHash,
        verification_status: 'pending',
        risk_assessment: 'low',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id'])
      .executeTakeFirst();
    
    console.log('✅ KYC documents uploaded and encrypted successfully');
    return { 
      success: true, 
      verificationId: result?.id 
    };
  } catch (error) {
    console.error('❌ KYC document upload failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * Gets KYC verification status for a user
 */
export async function getKYCStatus(userId: number): Promise<{
  hasVerification: boolean;
  status?: string;
  level?: string;
  verifiedAt?: string;
  expiresAt?: string;
  canResubmit: boolean;
}> {
  try {
    const verification = await db
      .selectFrom('kyc_verifications')
      .select([
        'verification_status', 
        'verification_level',
        'verified_at',
        'expires_at',
        'created_at'
      ])
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
    
    if (!verification) {
      return {
        hasVerification: false,
        canResubmit: true
      };
    }
    
    // Check if user can resubmit (only if rejected or expired)
    const canResubmit = verification.verification_status === 'rejected' || 
                       (verification.expires_at && new Date(verification.expires_at) < new Date());
    
    return {
      hasVerification: true,
      status: verification.verification_status,
      level: verification.verification_level,
      verifiedAt: verification.verified_at || undefined,
      expiresAt: verification.expires_at || undefined,
      canResubmit
    };
  } catch (error) {
    console.error('❌ Failed to get KYC status:', error);
    return {
      hasVerification: false,
      canResubmit: true
    };
  }
}

/**
 * Updates KYC verification status (for admin use)
 */
export async function updateKYCStatus(
  verificationId: number, 
  status: 'approved' | 'rejected' | 'under_review',
  notes?: string
): Promise<boolean> {
  try {
    console.log('🔍 Updating KYC verification status:', verificationId, status);
    
    const updateData: any = {
      verification_status: status,
      updated_at: new Date().toISOString()
    };
    
    if (notes) {
      updateData.compliance_notes = notes;
    }
    
    if (status === 'approved') {
      updateData.verified_at = new Date().toISOString();
      // Set expiration to 2 years from now
      updateData.expires_at = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    await db
      .updateTable('kyc_verifications')
      .set(updateData)
      .where('id', '=', verificationId)
      .execute();
    
    console.log('✅ KYC verification status updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update KYC status:', error);
    return false;
  }
}

/**
 * Retrieves encrypted document for viewing (admin only)
 */
export async function getEncryptedDocument(verificationId: number, documentType: 'main' | 'selfie'): Promise<Buffer | null> {
  try {
    const verification = await db
      .selectFrom('kyc_verifications')
      .select(['document_image_url', 'selfie_image_url', 'user_id'])
      .where('id', '=', verificationId)
      .executeTakeFirst();
    
    if (!verification) {
      return null;
    }
    
    const filePath = documentType === 'main' ? verification.document_image_url : verification.selfie_image_url;
    
    if (!filePath) {
      return null;
    }
    
    // Read encrypted file
    const encryptedData = fs.readFileSync(filePath, 'base64');
    
    // Extract document ID from file path for decryption key
    const documentId = path.basename(filePath, '.enc');
    
    // Decrypt document
    const decryptedData = decryptDocument(encryptedData, documentId);
    
    return decryptedData;
  } catch (error) {
    console.error('❌ Failed to retrieve encrypted document:', error);
    return null;
  }
}

/**
 * Gets all pending KYC verifications (admin only)
 */
export async function getPendingKYCVerifications(): Promise<any[]> {
  try {
    const verifications = await db
      .selectFrom('kyc_verifications')
      .leftJoin('users', 'kyc_verifications.user_id', 'users.id')
      .select([
        'kyc_verifications.id',
        'kyc_verifications.user_id',
        'kyc_verifications.document_type',
        'kyc_verifications.verification_status',
        'kyc_verifications.created_at',
        'users.username',
        'users.email'
      ])
      .where('kyc_verifications.verification_status', 'in', ['pending', 'under_review'])
      .orderBy('kyc_verifications.created_at', 'asc')
      .execute();
    
    return verifications;
  } catch (error) {
    console.error('❌ Failed to get pending verifications:', error);
    return [];
  }
}

/**
 * Validates document type
 */
export function isValidDocumentType(documentType: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(documentType);
}

/**
 * Gets document type display name
 */
export function getDocumentTypeDisplayName(documentType: string): string {
  const displayNames: Record<string, string> = {
    'passport': 'Passport',
    'drivers_license': 'Driver\'s License',
    'national_id': 'National ID Card',
    'residence_permit': 'Residence Permit',
    'utility_bill': 'Utility Bill',
    'bank_statement': 'Bank Statement'
  };
  
  return displayNames[documentType] || documentType;
}