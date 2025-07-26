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
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  User, 
  Plus,
  Radio,
  Shield,
  Siren,
  Flame,
  CloudRain,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';

interface CrisisAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
  created_at: string;
  creator_username: string;
  created_by: number;
}

export function CrisisPage() {
  const { user } = useAuth();
  const [crisisAlerts, setCrisisAlerts] = useState<CrisisAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    title: '',
    description: '',
    severity: '',
    latitude: '',
    longitude: '',
    radius: '1000'
  });

  useEffect(() => {
    fetchCrisisAlerts();
  }, []);

  const fetchCrisisAlerts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/crisis-alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCrisisAlerts(data.data);
      }
    } catch (error) {
      console.error('Crisis alerts fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/crisis-alerts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newAlert,
          latitude: parseFloat(newAlert.latitude),
          longitude: parseFloat(newAlert.longitude),
          radius: parseInt(newAlert.radius)
        })
      });
      
      if (response.ok) {
        setShowCreateDialog(false);
        setNewAlert({
          title: '',
          description: '',
          severity: '',
          latitude: '',
          longitude: '',
          radius: '1000'
        });
        fetchCrisisAlerts();
      }
    } catch (error) {
      console.error('Create alert error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewAlert({
            ...newAlert,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-orange-500 text-white';
      case 'low': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <Siren className="h-4 w-4" />;
      case 'high': return <Flame className="h-4 w-4" />;
      case 'medium': return <CloudRain className="h-4 w-4" />;
      case 'low': return <Zap className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
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

  const formatRadius = (radius: number) => {
    if (radius >= 1000) {
      return `${(radius / 1000).toFixed(1)}km`;
    }
    return `${radius}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Crisis Management
            </h1>
            <p className="text-gray-600">Community crisis alerts and emergency responses</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Report Crisis
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">Report Crisis Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Crisis Title</Label>
                  <Input
                    id="title"
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({...newAlert, title: e.target.value})}
                    placeholder="Brief description of the crisis"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({...newAlert, description: e.target.value})}
                    placeholder="Detailed information about the crisis"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="severity">Severity Level</Label>
                  <Select value={newAlert.severity} onValueChange={(value) => setNewAlert({...newAlert, severity: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minor issue</SelectItem>
                      <SelectItem value="medium">Medium - Moderate concern</SelectItem>
                      <SelectItem value="high">High - Serious situation</SelectItem>
                      <SelectItem value="critical">Critical - Life threatening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={newAlert.latitude}
                      onChange={(e) => setNewAlert({...newAlert, latitude: e.target.value})}
                      placeholder="0.0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={newAlert.longitude}
                      onChange={(e) => setNewAlert({...newAlert, longitude: e.target.value})}
                      placeholder="0.0000"
                    />
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  className="w-full"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Use Current Location
                </Button>
                
                <div>
                  <Label htmlFor="radius">Alert Radius (meters)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={newAlert.radius}
                    onChange={(e) => setNewAlert({...newAlert, radius: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                
                <Button onClick={handleCreateAlert} className="w-full bg-red-600 hover:bg-red-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Create Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Emergency Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Emergency Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-red-700">🚨 Emergency Services</p>
                  <p className="text-red-600">911 (US) | 999 (UK) | 112 (EU)</p>
                </div>
                <div>
                  <p className="font-medium text-red-700">🏥 Medical Emergency</p>
                  <p className="text-red-600">Call 911 immediately</p>
                </div>
                <div>
                  <p className="font-medium text-red-700">🔥 Fire Department</p>
                  <p className="text-red-600">Call 911 immediately</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Crisis Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <Siren className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600">
                {crisisAlerts.filter(a => a.severity === 'critical').length}
              </p>
              <p className="text-sm text-gray-600">Critical Alerts</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600">
                {crisisAlerts.filter(a => a.severity === 'high').length}
              </p>
              <p className="text-sm text-gray-600">High Priority</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <CloudRain className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">
                {crisisAlerts.filter(a => a.severity === 'medium').length}
              </p>
              <p className="text-sm text-gray-600">Medium Priority</p>
            </CardContent>
          </Card>
          
          <Card className="galax-card">
            <CardContent className="p-4 text-center">
              <Radio className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                {crisisAlerts.filter(a => a.status === 'active').length}
              </p>
              <p className="text-sm text-gray-600">Active Alerts</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Crisis Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold text-gray-800">Active Crisis Alerts</h2>
          
          {crisisAlerts.length === 0 ? (
            <Card className="galax-card">
              <CardContent className="p-12 text-center">
                <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No active crisis alerts</h3>
                <p className="text-gray-500">Your community is currently safe. Stay vigilant!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {crisisAlerts.map((alert) => (
                <Card key={alert.id} className="galax-card border-l-4 border-red-500 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(alert.severity)}
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{alert.description}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Radio className="h-3 w-3" />
                        <span>{formatRadius(alert.radius)} radius</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-gray-500">
                        <User className="h-3 w-3" />
                        Reported by {alert.creator_username}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(alert.created_at)}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          View Location
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <Radio className="h-4 w-4 mr-2" />
                          Share Alert
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Safety Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="galax-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Safety Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">🚨 During a Crisis</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Stay calm and assess the situation</li>
                    <li>• Call emergency services if needed</li>
                    <li>• Follow official instructions</li>
                    <li>• Keep emergency contacts handy</li>
                    <li>• Stay informed through official channels</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">📱 Reporting Guidelines</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Report only verified information</li>
                    <li>• Be specific about location and time</li>
                    <li>• Include relevant details and severity</li>
                    <li>• Don't spread unconfirmed rumors</li>
                    <li>• Follow up with updates if needed</li>
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
