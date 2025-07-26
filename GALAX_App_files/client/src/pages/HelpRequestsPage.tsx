/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import VirtualizedList, { useVirtualizedList } from '../components/VirtualizedList';
import { 
  HandHeart, 
  MapPin, 
  Clock, 
  User, 
  Plus,
  Filter,
  Search,
  AlertTriangle,
  Home,
  Car,
  Utensils,
  GraduationCap,
  Heart,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HelpRequest {
  id: number;
  title: string;
  description: string;
  category: string;
  urgency: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  requester_username: string;
  requester_avatar: string | null;
  helper_username: string | null;
  media_url: string | null;
  media_type: string;
}

interface PaginationData {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
  next_page: number | null;
  previous_page: number | null;
  first_item: number;
  last_item: number;
}

interface ApiResponse {
  success: boolean;
  data: HelpRequest[];
  pagination: PaginationData;
  meta: {
    filters_applied: any;
    sort: any;
    request_timestamp: string;
  };
}

export function HelpRequestsPage() {
  const { user } = useAuth();
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [filter, setFilter] = useState({
    category: '',
    urgency: '',
    status: '',
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    urgency: '',
    location: ''
  });

  // Use virtualized list hook
  const {
    isLoading: listLoading,
    handleLoadMore,
    scrollToTop
  } = useVirtualizedList(helpRequests, {
    onItemsChange: setHelpRequests
  });

  // Debounced search
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      setFilter(prev => ({ ...prev, search: searchTerm }));
      setCurrentPage(1);
    }, 300);
    
    setSearchDebounceTimer(timer);
  }, [searchDebounceTimer]);

  useEffect(() => {
    fetchHelpRequests();
  }, [filter, currentPage, pageSize]);

  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  const fetchHelpRequests = async (append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      }
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filter.category) params.append('category', filter.category);
      if (filter.urgency) params.append('urgency', filter.urgency);
      if (filter.status) params.append('status', filter.status);
      if (filter.search) params.append('search', filter.search);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      params.append('sortBy', filter.sortBy);
      params.append('sortOrder', filter.sortOrder);
      
      const response = await fetch(`/api/help-requests?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'API-Version': 'v1'
        }
      });
      
      if (response.ok) {
        const apiResponse: ApiResponse = await response.json();
        
        if (append) {
          setHelpRequests(prev => [...prev, ...apiResponse.data]);
        } else {
          setHelpRequests(apiResponse.data);
        }
        
        setPagination(apiResponse.pagination);
      } else {
        console.error('Failed to fetch help requests');
      }
    } catch (error) {
      console.error('Help requests fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreItems = async (): Promise<HelpRequest[]> => {
    if (!pagination?.has_next_page) return [];
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    
    // The useEffect will trigger fetchHelpRequests
    return [];
  };

  const handleCreateRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/help-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRequest)
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        setNewRequest({
          title: '',
          description: '',
          category: '',
          urgency: '',
          location: ''
        });
        fetchHelpRequests();
      }
    } catch (error) {
      console.error('Create request error:', error);
    }
  };

  const handleOfferHelp = async (helpRequestId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/help-requests/${helpRequestId}/offer-help`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchHelpRequests();
      }
    } catch (error) {
      console.error('Offer help error:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-blue-500 text-white';
      case 'matched': return 'bg-purple-500 text-white';
      case 'in_progress': return 'bg-yellow-500 text-white';
      case 'completed': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'emergency': return <AlertTriangle className="h-4 w-4" />;
      case 'transportation': return <Car className="h-4 w-4" />;
      case 'food': return <Utensils className="h-4 w-4" />;
      case 'housing': return <Home className="h-4 w-4" />;
      case 'healthcare': return <Heart className="h-4 w-4" />;
      case 'education': return <GraduationCap className="h-4 w-4" />;
      case 'technology': return <Wrench className="h-4 w-4" />;
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

  // Memoized help request card component
  const HelpRequestCard = React.memo(({ request, index, isVisible }: { 
    request: HelpRequest; 
    index: number; 
    isVisible: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0.7, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`w-full ${viewMode === 'grid' ? 'px-3' : 'px-0'}`}
    >
      <Card 
        className="galax-card hover:shadow-lg transition-shadow h-full"
        role="article"
        aria-labelledby={`request-title-${request.id}`}
        aria-describedby={`request-desc-${request.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div aria-hidden="true">{getCategoryIcon(request.category)}</div>
              <CardTitle 
                id={`request-title-${request.id}`}
                className="text-lg line-clamp-1"
              >
                {request.title}
              </CardTitle>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Badge 
                className={getUrgencyColor(request.urgency)}
                aria-label={`Urgency: ${request.urgency}`}
              >
                {request.urgency}
              </Badge>
              <Badge 
                className={getStatusColor(request.status)}
                aria-label={`Status: ${request.status}`}
              >
                {request.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p 
            id={`request-desc-${request.id}`}
            className="text-gray-600 text-sm line-clamp-3"
          >
            {request.description}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden="true" />
              <span aria-label={`Requested by ${request.requester_username}`}>
                {request.requester_username}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <time 
                dateTime={request.created_at}
                title={new Date(request.created_at).toLocaleString()}
              >
                {formatTimeAgo(request.created_at)}
              </time>
            </div>
          </div>
          
          {request.latitude && request.longitude && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              <span>Location provided</span>
            </div>
          )}
          
          {request.media_url && (
            <div className="text-sm text-gray-500" aria-label={`${request.media_type} attachment available`}>
              📎 {request.media_type} attachment
            </div>
          )}
          
          <div className="pt-2">
            {request.status === 'posted' && (
              <Button 
                onClick={() => handleOfferHelp(request.id)}
                className="galax-button w-full"
                disabled={request.requester_username === user?.username}
                aria-label={`Offer help for: ${request.title}`}
              >
                <HandHeart className="h-4 w-4 mr-2" aria-hidden="true" />
                Offer Help
              </Button>
            )}
            
            {request.status === 'matched' && (
              <div className="text-center text-sm text-gray-600">
                Helper: <span className="font-medium">{request.helper_username}</span>
              </div>
            )}
            
            {request.status === 'completed' && (
              <div 
                className="text-center text-sm text-green-600 font-medium"
                aria-label="Request completed"
              >
                ✅ Completed
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ));

  HelpRequestCard.displayName = 'HelpRequestCard';

  // Pagination component
  const PaginationControls = React.memo(() => {
    if (!pagination || pagination.total_pages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex justify-between items-center sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(pagination.previous_page || 1)}
            disabled={!pagination.has_previous_page}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(pagination.next_page || pagination.total_pages)}
            disabled={!pagination.has_next_page}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{pagination.first_item}</span> to{' '}
              <span className="font-medium">{pagination.last_item}</span> of{' '}
              <span className="font-medium">{pagination.total_items}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={!pagination.has_previous_page}
                className="rounded-l-md"
                aria-label="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.previous_page || 1)}
                disabled={!pagination.has_previous_page}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                const pageNum = Math.max(1, pagination.current_page - 2) + i;
                if (pageNum > pagination.total_pages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.current_page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === pagination.current_page ? "page" : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.next_page || pagination.total_pages)}
                disabled={!pagination.has_next_page}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.total_pages)}
                disabled={!pagination.has_next_page}
                className="rounded-r-md"
                aria-label="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  });

  PaginationControls.displayName = 'PaginationControls';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Help Requests
            </h1>
            <p className="text-gray-600">Connect with your community</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="galax-button">
                <Plus className="h-4 w-4 mr-2" />
                Request Help
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Help Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({...newRequest, title: e.target.value})}
                    placeholder="Brief description of what you need"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    placeholder="Detailed description of your request"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newRequest.category} onValueChange={(value) => setNewRequest({...newRequest, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="housing">Housing</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="urgency">Urgency</Label>
                    <Select value={newRequest.urgency} onValueChange={(value) => setNewRequest({...newRequest, urgency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={handleCreateRequest} className="galax-button w-full">
                  Create Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="galax-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Filters:</span>
                </div>
                
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      placeholder="Search help requests..."
                      className="pl-10"
                      value={filter.search}
                      onChange={(e) => debouncedSearch(e.target.value)}
                      aria-label="Search help requests by title, description, or username"
                    />
                  </div>
                </div>
                
                <Select value={filter.category} onValueChange={(value) => setFilter({...filter, category: value})}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filter.urgency} onValueChange={(value) => setFilter({...filter, urgency: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Urgency</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="matched">Matched</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Help Requests List with Virtualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border overflow-hidden"
        >
          {/* View Mode Controls */}
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {pagination ? `${pagination.total_items} results` : `${helpRequests.length} results`}
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-gray-600">Show:</label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <Select
                value={filter.sortBy}
                onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="urgency">Urgency</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filter.sortOrder}
                onValueChange={(value) => setFilter(prev => ({ ...prev, sortOrder: value }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">↓</SelectItem>
                  <SelectItem value="asc">↑</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {helpRequests.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <HandHeart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No help requests found</h3>
              <p className="text-gray-500">Try adjusting your filters or create a new request</p>
            </div>
          ) : (
            <VirtualizedList
              items={helpRequests}
              itemHeight={viewMode === 'grid' ? 280 : 200}
              containerHeight={600}
              renderItem={(request, index, isVisible) => (
                <HelpRequestCard
                  request={request}
                  index={index}
                  isVisible={isVisible}
                />
              )}
              keyExtractor={(request) => request.id.toString()}
              loading={isLoading}
              onEndReached={pagination?.has_next_page ? loadMoreItems : undefined}
              onEndReachedThreshold={0.8}
              emptyComponent={
                <div className="text-center py-12">
                  <HandHeart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No help requests found</h3>
                  <p className="text-gray-500">Try adjusting your filters or create a new request</p>
                </div>
              }
              className="px-4"
            />
          )}

          {/* Pagination Controls */}
          <PaginationControls />
        </motion.div>
      </div>
    </div>
  );
}
