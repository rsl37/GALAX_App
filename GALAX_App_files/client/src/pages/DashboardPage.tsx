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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Home, 
  HandHeart, 
  AlertTriangle, 
  Vote, 
  Users, 
  TrendingUp,
  Clock,
  MapPin,
  Plus,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UserStats {
  helpRequestsCreated: number;
  helpOffered: number;
  crisisReported: number;
  proposalsCreated: number;
  votescast: number;
  communityScore: number;
  badgesEarned: string[];
  recentActivity: any[];
}

interface HelpRequest {
  id: number;
  title: string;
  category: string;
  urgency: string;
  requester_username: string;
  created_at: string;
  status: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentHelp, setRecentHelp] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
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
      
      // Fetch recent help requests
      const helpResponse = await fetch('/api/help-requests?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (helpResponse.ok) {
        const helpData = await helpResponse.json();
        setRecentHelp(helpData.data);
      }
      
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      case 'transportation': return <MapPin className="h-4 w-4" />;
      case 'food': return <Home className="h-4 w-4" />;
      default: return <HandHeart className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-lg text-gray-600">
            Your civic network dashboard
          </p>
        </motion.div>

        {/* Token Balances */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="galax-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Action Points</p>
                  <p className="text-2xl font-bold text-purple-600">{user?.ap_balance || 0}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Crowds Stablecoin</p>
                  <p className="text-2xl font-bold text-green-600">{user?.crowds_balance || 0}</p>
                  <p className="text-xs text-gray-500">≈ ${((user?.crowds_balance || 0) * 1.0).toFixed(2)} USD</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Governance Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{user?.gov_balance || 0}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Vote className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reputation</p>
                  <p className="text-2xl font-bold text-orange-600">{user?.reputation_score || 0}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Stats */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            <Card className="galax-card">
              <CardContent className="p-4 text-center">
                <HandHeart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{stats.helpRequestsCreated}</p>
                <p className="text-sm text-gray-600">Help Requested</p>
              </CardContent>
            </Card>
            
            <Card className="galax-card">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{stats.helpOffered}</p>
                <p className="text-sm text-gray-600">Help Offered</p>
              </CardContent>
            </Card>
            
            <Card className="galax-card">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="text-2xl font-bold">{stats.crisisReported}</p>
                <p className="text-sm text-gray-600">Crisis Reported</p>
              </CardContent>
            </Card>
            
            <Card className="galax-card">
              <CardContent className="p-4 text-center">
                <Vote className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{stats.proposalsCreated}</p>
                <p className="text-sm text-gray-600">Proposals Created</p>
              </CardContent>
            </Card>
            
            <Card className="galax-card">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-2xl font-bold">{stats.votescast}</p>
                <p className="text-sm text-gray-600">Votes Cast</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Help Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HandHeart className="h-5 w-5" />
                Recent Help Requests
              </CardTitle>
              <CardDescription>
                Latest community help requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentHelp.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <HandHeart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent help requests</p>
                </div>
              ) : (
                recentHelp.map((help) => (
                  <div key={help.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(help.category)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium truncate">{help.title}</p>
                        <p className="text-sm text-gray-600">by {help.requester_username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getUrgencyColor(help.urgency)} text-white text-xs`}>
                        {help.urgency}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(help.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Get involved in your community
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="galax-button w-full justify-start">
                <HandHeart className="h-4 w-4 mr-2" />
                Request Help
              </Button>
              <Button className="galax-button w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Crisis
              </Button>
              <Button className="galax-button w-full justify-start">
                <Vote className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
              <Button className="galax-button w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Browse Help Requests
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Community Impact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Community Impact
              </CardTitle>
              <CardDescription>
                Your contribution to the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Community Level</span>
                      <span>Level {Math.floor((user?.reputation_score || 0) / 100) + 1}</span>
                    </div>
                    <Progress value={((user?.reputation_score || 0) % 100)} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Help Completion Rate</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">People Helped</span>
                    <span className="font-medium">{stats?.helpOffered || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Crisis Responses</span>
                    <span className="font-medium">{stats?.crisisReported || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Governance Participation</span>
                    <span className="font-medium">{stats?.votescast || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
