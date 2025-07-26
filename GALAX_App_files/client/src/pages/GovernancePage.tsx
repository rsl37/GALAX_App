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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Vote, 
  Clock, 
  User, 
  Plus,
  Calendar,
  TrendingUp,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  DollarSign,
  Scale,
  TreePine,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Proposal {
  id: number;
  title: string;
  description: string;
  category: string;
  deadline: string;
  status: string;
  votes_for: number;
  votes_against: number;
  created_at: string;
  creator_username: string;
  created_by: number;
  user_vote: string | null;
}

export function GovernancePage() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    category: '',
    status: ''
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: '',
    deadline: ''
  });

  useEffect(() => {
    fetchProposals();
  }, [filter]);

  const fetchProposals = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filter.category) params.append('category', filter.category);
      if (filter.status) params.append('status', filter.status);
      
      const response = await fetch(`/api/proposals?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProposals(data.data);
      }
    } catch (error) {
      console.error('Proposals fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProposal)
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        setNewProposal({
          title: '',
          description: '',
          category: '',
          deadline: ''
        });
        fetchProposals();
      }
    } catch (error) {
      console.error('Create proposal error:', error);
    }
  };

  const handleVote = async (proposalId: number, voteType: 'for' | 'against') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote_type: voteType })
      });
      
      if (response.ok) {
        fetchProposals();
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'infrastructure': return 'bg-blue-500 text-white';
      case 'budget': return 'bg-green-500 text-white';
      case 'policy': return 'bg-purple-500 text-white';
      case 'community': return 'bg-orange-500 text-white';
      case 'environment': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500 text-white';
      case 'passed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'expired': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'infrastructure': return <Building className="h-4 w-4" />;
      case 'budget': return <DollarSign className="h-4 w-4" />;
      case 'policy': return <Scale className="h-4 w-4" />;
      case 'community': return <Users className="h-4 w-4" />;
      case 'environment': return <TreePine className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatTimeLeft = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const getVotePercentage = (votesFor: number, votesAgainst: number) => {
    const total = votesFor + votesAgainst;
    if (total === 0) return { forPercentage: 0, againstPercentage: 0 };
    
    return {
      forPercentage: Math.round((votesFor / total) * 100),
      againstPercentage: Math.round((votesAgainst / total) * 100)
    };
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

  const getMinDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Governance
            </h1>
            <p className="text-gray-600">Participate in democratic decision-making</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="galax-button">
                <Plus className="h-4 w-4 mr-2" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Proposal Title</Label>
                  <Input
                    id="title"
                    value={newProposal.title}
                    onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                    placeholder="Brief, clear title for your proposal"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProposal.description}
                    onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                    placeholder="Detailed description of your proposal, including reasoning and expected outcomes"
                    rows={5}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newProposal.category} onValueChange={(value) => setNewProposal({...newProposal, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
                        <SelectItem value="environment">Environment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="deadline">Voting Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newProposal.deadline}
                      onChange={(e) => setNewProposal({...newProposal, deadline: e.target.value})}
                      min={getMinDeadline()}
                    />
                  </div>
                </div>
                
                <Button onClick={handleCreateProposal} className="galax-button w-full">
                  Create Proposal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Governance Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <Vote className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">
                {proposals.filter(p => p.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active Proposals</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                {proposals.filter(p => p.status === 'passed').length}
              </p>
              <p className="text-sm text-gray-600">Passed</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">
                {proposals.reduce((sum, p) => sum + p.votes_for + p.votes_against, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Votes</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">
                {user?.gov_balance || 0}
              </p>
              <p className="text-sm text-gray-600">Voting Power</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="galax-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Vote className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Filter by:</span>
                </div>
                
                <Select value={filter.category} onValueChange={(value) => setFilter({...filter, category: value})}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Proposals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          {proposals.length === 0 ? (
            <Card className="galax-card">
              <CardContent className="p-12 text-center">
                <Vote className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No proposals found</h3>
                <p className="text-gray-500">Be the first to create a proposal for your community!</p>
              </CardContent>
            </Card>
          ) : (
            proposals.map((proposal) => {
              const { forPercentage, againstPercentage } = getVotePercentage(proposal.votes_for, proposal.votes_against);
              const totalVotes = proposal.votes_for + proposal.votes_against;
              const timeLeft = formatTimeLeft(proposal.deadline);
              const isExpired = new Date(proposal.deadline) < new Date();
              const hasVoted = proposal.user_vote;
              const isOwnProposal = proposal.created_by === user?.id;
              
              return (
                <Card key={proposal.id} className="galax-card hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {getCategoryIcon(proposal.category)}
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getCategoryColor(proposal.category)}>
                          {proposal.category}
                        </Badge>
                        <Badge className={getStatusColor(proposal.status)}>
                          {proposal.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{proposal.description}</p>
                    
                    {/* Voting Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">
                          For: {proposal.votes_for} ({forPercentage}%)
                        </span>
                        <span className="text-red-600 font-medium">
                          Against: {proposal.votes_against} ({againstPercentage}%)
                        </span>
                      </div>
                      <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-green-500 transition-all duration-300"
                          style={{ width: `${forPercentage}%` }}
                        />
                        <div 
                          className="bg-red-500 transition-all duration-300"
                          style={{ width: `${againstPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Total votes: {totalVotes}</span>
                        <span>Quorum: {Math.max(10, Math.ceil(totalVotes * 0.1))}</span>
                      </div>
                    </div>
                    
                    {/* Proposal Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <User className="h-3 w-3" />
                        <span>By {proposal.creator_username}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>Created {formatTimeAgo(proposal.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span className={isExpired ? 'text-red-500' : 'text-orange-500'}>
                          {timeLeft}
                        </span>
                      </div>
                    </div>
                    
                    {/* Voting Buttons */}
                    <div className="pt-4 border-t">
                      {hasVoted ? (
                        <div className="text-center">
                          <Badge className="bg-blue-100 text-blue-800">
                            You voted: {hasVoted}
                          </Badge>
                        </div>
                      ) : isOwnProposal ? (
                        <div className="text-center text-gray-500">
                          <AlertCircle className="h-4 w-4 inline mr-1" />
                          You cannot vote on your own proposal
                        </div>
                      ) : isExpired ? (
                        <div className="text-center text-gray-500">
                          <XCircle className="h-4 w-4 inline mr-1" />
                          Voting period has ended
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleVote(proposal.id, 'for')}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Vote For
                          </Button>
                          <Button 
                            onClick={() => handleVote(proposal.id, 'against')}
                            variant="outline"
                            className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Vote Against
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </motion.div>

        {/* Democracy Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                How Democratic Governance Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">🗳️ Voting Process</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• All verified users can vote on proposals</li>
                    <li>• Voting power equals your governance balance</li>
                    <li>• One vote per proposal per user</li>
                    <li>• Proposals need minimum votes to pass</li>
                    <li>• Transparent and auditable results</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">📝 Creating Proposals</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Must be specific and actionable</li>
                    <li>• Include clear reasoning and benefits</li>
                    <li>• Set appropriate voting deadlines</li>
                    <li>• Choose relevant categories</li>
                    <li>• Engage with community feedback</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
