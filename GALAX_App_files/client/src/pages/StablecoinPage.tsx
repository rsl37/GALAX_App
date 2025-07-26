/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Stablecoin Page
 * Main page for stablecoin functionality and dashboard
 */

import React from 'react';
import { StablecoinDashboard } from '../components/StablecoinDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Coins, 
  BarChart3, 
  Shield, 
  TrendingUp,
  Info,
  BookOpen
} from 'lucide-react';

export function StablecoinPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Coins className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Algorithmic Stablecoin
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-600">
              CROWDS Token
            </Badge>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl">
            Experience the future of digital currency with our algorithmic stablecoin. 
            Crowds Tokens automatically maintain price stability through protocol-controlled 
            monetary policies, providing a reliable store of value and medium of exchange.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">Price Stability</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Algorithmic monetary policy automatically adjusts token supply to maintain 
                price stability around the $1.00 peg, reducing volatility and providing 
                predictable value.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">Transparent Supply</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All supply adjustments are transparent and auditable. View real-time 
                metrics, supply changes, and the reasoning behind each monetary policy 
                decision.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg">Reserve Backed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                The stablecoin is backed by reserves that provide additional stability 
                and confidence. Reserve ratios are maintained to ensure system resilience.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <StablecoinDashboard />

        {/* How It Works Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              <CardTitle>How the Algorithmic Stablecoin Works</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3">Monetary Policy Engine</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h5 className="font-medium">Price Monitoring</h5>
                      <p className="text-sm text-gray-600">
                        Continuous price feeds from multiple oracles track the market price of Crowds Tokens
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <div>
                      <h5 className="font-medium">Deviation Detection</h5>
                      <p className="text-sm text-gray-600">
                        When price deviates beyond tolerance bands, the system calculates required supply adjustments
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <div>
                      <h5 className="font-medium">Supply Adjustment</h5>
                      <p className="text-sm text-gray-600">
                        Tokens are minted (expansion) or burned (contraction) proportionally across all holders
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-lg mb-3">Stability Mechanisms</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium">Reserve Requirements</h5>
                      <p className="text-sm text-gray-600">
                        Minimum reserve ratios ensure system stability and prevent excessive contractions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium">Rate Limiting</h5>
                      <p className="text-sm text-gray-600">
                        Maximum supply change limits prevent extreme adjustments and maintain stability
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium">Oracle Security</h5>
                      <p className="text-sm text-gray-600">
                        Multiple price sources and confidence scoring protect against manipulation attempts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800">Regulatory Compliance</h5>
                  <p className="text-sm text-yellow-700 mt-1">
                    This stablecoin implementation is designed to comply with applicable regulations 
                    for digital assets and stablecoins. All monetary policy decisions are transparent, 
                    auditable, and follow predetermined algorithmic rules to ensure fair and predictable operation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}