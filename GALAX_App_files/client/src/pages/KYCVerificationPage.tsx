/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Added 2025-01-11 17:01:45 UTC - KYC Document Verification page component
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Upload,
  Camera,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DocumentType {
  value: string;
  label: string;
}

export function KYCVerificationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'status' | 'upload' | 'complete'>('status');
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kycStatus, setKycStatus] = useState({
    hasVerification: false,
    status: '',
    level: '',
    verifiedAt: '',
    canResubmit: true
  });

  useEffect(() => {
    loadDocumentTypes();
    checkKYCStatus();
  }, []);

  const parseApiResponse = async (response: Response) => {
    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          if (errorData.error && typeof errorData.error === 'object') {
            errorMessage = errorData.error.message || errorMessage;
          } else if (errorData.error && typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error('Expected JSON response but got: ' + (text.substring(0, 100) + (text.length > 100 ? '...' : '')));
    }

    return await response.json();
  };

  const loadDocumentTypes = async () => {
    try {
      const response = await fetch('/api/kyc/document-types');
      const apiData = await parseApiResponse(response);
      setDocumentTypes(apiData.data);
    } catch (error) {
      console.error('Error loading document types:', error);
    }
  };

  const checkKYCStatus = async () => {
    try {
      const authToken = localStorage.getItem('token');
      if (!authToken) return;

      const response = await fetch('/api/kyc/status', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const apiData = await parseApiResponse(response);
      setKycStatus(apiData.data);
      
      if (apiData.data.hasVerification && apiData.data.status === 'approved') {
        setStep('complete');
      }
    } catch (error) {
      console.error('Status check error:', error);
    }
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        return;
      }
      
      setDocumentFile(file);
      setError('');
    }
  };

  const handleSelfieUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG and PNG files are allowed for selfie');
        return;
      }
      
      setSelfieFile(file);
      setError('');
    }
  };

  const submitKYCDocuments = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!selectedDocumentType || !documentNumber || !documentFile) {
        setError('Please fill in all required fields and upload your document');
        return;
      }

      const authToken = localStorage.getItem('token');
      if (!authToken) {
        setError('You must be logged in to submit KYC documents');
        return;
      }

      const formData = new FormData();
      formData.append('documentType', selectedDocumentType);
      formData.append('documentNumber', documentNumber);
      formData.append('document', documentFile);
      
      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }

      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      const apiData = await parseApiResponse(response);
      
      if (apiData.success) {
        setSuccess('Documents uploaded successfully! Your verification is now under review.');
        setStep('complete');
        await checkKYCStatus();
      }
    } catch (error) {
      console.error('KYC upload error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'under_review': return 'text-blue-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'under_review': return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'rejected': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const renderStatusStep = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <FileText className={`h-10 w-10 ${kycStatus.hasVerification && kycStatus.status === 'approved' ? 'text-green-500' : 'text-blue-500'}`} />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">
            KYC Verification
          </h3>
          <p className="text-gray-600">
            {kycStatus.hasVerification 
              ? `Your verification status: ${kycStatus.status}` 
              : 'Verify your identity to access all platform features'
            }
          </p>
        </div>

        {kycStatus.hasVerification && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(kycStatus.status)}
              <span className={`font-medium ${getStatusColor(kycStatus.status)}`}>
                Status: {kycStatus.status.charAt(0).toUpperCase() + kycStatus.status.slice(1).replace('_', ' ')}
              </span>
            </div>
            {kycStatus.verifiedAt && (
              <p className="text-sm text-gray-600">
                Verified on: {new Date(kycStatus.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-left">
          <h4 className="font-medium text-blue-900 mb-2">KYC Benefits:</h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Access to token mining features</li>
            <li>• Higher transaction limits</li>
            <li>• Enhanced security and trust</li>
            <li>• Compliance with regulations</li>
            <li>• Access to governance features</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {!kycStatus.hasVerification || kycStatus.canResubmit ? (
          <Button
            onClick={() => setStep('upload')}
            disabled={isLoading}
            className="galax-button w-full"
          >
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {kycStatus.hasVerification ? 'Resubmit Documents' : 'Start KYC Verification'}
            </div>
          </Button>
        ) : (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800 text-sm text-center">
              Your KYC verification is {kycStatus.status}. Please wait for the review process to complete.
            </p>
          </div>
        )}
        
        <Button
          onClick={() => navigate('/dashboard')}
          variant="ghost"
          className="w-full"
        >
          Back to Dashboard
        </Button>
      </div>
    </CardContent>
  );

  const renderUploadStep = () => (
    <CardContent className="space-y-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Upload Identity Documents</h3>
        <p className="text-gray-600">
          Please provide a valid government-issued ID and a selfie for verification
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Document Type *</Label>
          <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="documentNumber">Document Number *</Label>
          <Input
            id="documentNumber"
            type="text"
            placeholder="Enter document number"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document">Document Image/PDF *</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              id="document"
              type="file"
              accept="image/*,.pdf"
              onChange={handleDocumentUpload}
              className="hidden"
              disabled={isLoading}
            />
            <label htmlFor="document" className="cursor-pointer">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {documentFile ? documentFile.name : 'Click to upload document'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPEG, PNG, or PDF (max 10MB)
              </p>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="selfie">Selfie (Optional but recommended)</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              id="selfie"
              type="file"
              accept="image/*"
              onChange={handleSelfieUpload}
              className="hidden"
              disabled={isLoading}
            />
            <label htmlFor="selfie" className="cursor-pointer">
              <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {selfieFile ? selfieFile.name : 'Click to upload selfie'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Hold your ID next to your face (JPEG, PNG max 10MB)
              </p>
            </label>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Important Guidelines:</h4>
              <ul className="text-yellow-800 text-sm space-y-1">
                <li>• Ensure document is clear and all text is readable</li>
                <li>• Document must be valid and not expired</li>
                <li>• All four corners of the document must be visible</li>
                <li>• No glare or shadows on the document</li>
                <li>• Personal information must match your account details</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={submitKYCDocuments}
          disabled={!selectedDocumentType || !documentNumber || !documentFile || isLoading}
          className="galax-button w-full"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Submit for Verification
            </div>
          )}
        </Button>

        <Button
          onClick={() => setStep('status')}
          variant="ghost"
          className="w-full"
        >
          Back
        </Button>
      </div>
    </CardContent>
  );

  const renderCompleteStep = () => (
    <CardContent className="space-y-6 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-green-600">
          Documents Submitted Successfully!
        </h3>
        <p className="text-gray-600">
          Your KYC documents are now under review. We'll notify you once the verification is complete.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg text-left">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Our team will review your documents within 1-3 business days</li>
          <li>• You'll receive an email notification with the results</li>
          <li>• Once approved, you'll have access to all platform features</li>
          <li>• If additional information is needed, we'll contact you</li>
        </ul>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => navigate('/dashboard')}
          className="galax-button w-full"
        >
          Continue to Dashboard
        </Button>
        
        <Button
          onClick={() => {
            setStep('status');
            checkKYCStatus();
          }}
          variant="outline"
          className="w-full"
        >
          Check Status
        </Button>
      </div>
    </CardContent>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="galax-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              KYC Verification
            </CardTitle>
            <CardDescription>
              Verify your identity to unlock all platform features
            </CardDescription>
          </CardHeader>
          
          {error && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Success</span>
              </div>
              <p className="text-green-600 text-sm mt-1">{success}</p>
            </div>
          )}

          {step === 'status' && renderStatusStep()}
          {step === 'upload' && renderUploadStep()}
          {step === 'complete' && renderCompleteStep()}
        </Card>
      </motion.div>
    </div>
  );
}