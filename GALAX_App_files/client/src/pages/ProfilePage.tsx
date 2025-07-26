/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  Settings,
  Shield,
  Award,
  Star,
  TrendingUp,
  Activity,
  DollarSign,
  Vote,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Key,
  Bell,
  Globe,
  Heart,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UserStats {
  helpRequestsCreated: number;
  helpOffered: number;
  crisisReported: number;
  proposalsCreated: number;
  votescast: number;
  recentActivity: any[];
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  token_type: string;
  description: string;
  created_at: string;
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    skills: ''
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user stats
      const statsResponse = await fetch('/api/user/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }
      
      // Fetch transactions
      const transactionsResponse = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.data);
      }
      
    } catch (error) {
      console.error('Profile data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });
      
      if (response.ok) {
        setIsEditing(false);
        await refreshUser();
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || name.substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const formatTransactionType = (type: string) => {
    const types: { [key: string]: string } = {
      'claim': 'Claim',
      'reward': 'Reward',
      'transfer': 'Transfer',
      'purchase': 'Purchase',
      'refund': 'Refund'
    };
    return types[type] || type;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'reward': return 'text-green-600';
      case 'claim': return 'text-blue-600';
      case 'transfer': return 'text-purple-600';
      case 'purchase': return 'text-orange-600';
      case 'refund': return 'text-cyan-600';
      default: return 'text-gray-600';
    }
  };

  const getReputationLevel = (score: number) => {
    if (score >= 10000) return { level: 'Legend', color: 'text-yellow-600', progress: 100 };
    if (score >= 5000) return { level: 'Champion', color: 'text-purple-600', progress: (score - 5000) / 5000 * 100 };
    if (score >= 2000) return { level: 'Expert', color: 'text-blue-600', progress: (score - 2000) / 3000 * 100 };
    if (score >= 500) return { level: 'Helper', color: 'text-green-600', progress: (score - 500) / 1500 * 100 };
    return { level: 'Newcomer', color: 'text-gray-600', progress: score / 500 * 100 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Profile Not Found</h2>
          <p className="text-gray-500">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const reputationInfo = getReputationLevel(user.reputation_score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-gray-600">Manage your GALAX account and community participation</p>
        </motion.div>

        {/* Profile Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="galax-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-2xl">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute -bottom-2 -right-2 h-8 w-8 p-0 bg-white shadow-md rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
                    {user.email_verified && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-600 mb-4">
                    {user.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since {formatTimeAgo(user.created_at || '')}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <Star className={`h-4 w-4 ${reputationInfo.color}`} />
                      <span className={`font-medium ${reputationInfo.color}`}>
                        {reputationInfo.level}
                      </span>
                      <span className="text-gray-600">
                        ({user.reputation_score} points)
                      </span>
                    </div>
                    <Progress value={reputationInfo.progress} className="h-2" />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={editForm.username}
                            onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="skills">Skills</Label>
                          <Textarea
                            id="skills"
                            value={editForm.skills}
                            onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                            placeholder="Describe your skills and expertise"
                          />
                        </div>
                        <Button onClick={handleUpdateProfile} className="galax-button w-full">
                          Save Changes
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Token Balances */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card className="galax-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Action Points</p>
                  <p className="text-2xl font-bold text-purple-600">{user.ap_balance}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">CROWDS Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{user.crowds_balance}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Governance</p>
                  <p className="text-2xl font-bold text-green-600">{user.gov_balance}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Vote className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Community Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Help Requests Created</span>
                    <span className="font-bold">{stats.helpRequestsCreated}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Help Offered</span>
                    <span className="font-bold">{stats.helpOffered}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Crisis Reported</span>
                    <span className="font-bold">{stats.crisisReported}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Proposals Created</span>
                    <span className="font-bold">{stats.proposalsCreated}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Votes Cast</span>
                    <span className="font-bold">{stats.votescast}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Loading activity stats...</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent transactions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{formatTransactionType(transaction.type)}</p>
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} {transaction.token_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Security & Verification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-gray-600">
                        {user.email_verified ? 'Verified' : 'Not verified'}
                      </p>
                    </div>
                  </div>
                  {user.email_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Phone Verification</p>
                      <p className="text-sm text-gray-600">
                        {user.phone_verified ? 'Verified' : 'Not verified'}
                      </p>
                    </div>
                  </div>
                  {user.phone_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Two-Factor Auth</p>
                      <p className="text-sm text-gray-600">
                        {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  {user.two_factor_enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-gray-600">Last changed recently</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements & Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements & Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No badges earned yet</p>
                <p className="text-sm mt-2">
                  Help your community and participate in governance to earn badges!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
