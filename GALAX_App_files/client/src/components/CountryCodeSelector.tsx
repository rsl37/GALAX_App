/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries, popularCountries, Country } from '@/data/countries';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryCodeSelectorProps {
  value?: string;
  onChange: (dialCode: string, country: Country) => void;
  className?: string;
  disabled?: boolean;
}

export function CountryCodeSelector({ 
  value = '+1', 
  onChange, 
  className,
  disabled = false 
}: CountryCodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Find the currently selected country
  const selectedCountry = countries.find(country => country.dialCode === value) || popularCountries[0];

  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    country.dialCode.includes(searchQuery) ||
    country.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show popular countries first if no search query
  const displayCountries = searchQuery ? filteredCountries : [
    ...popularCountries,
    { code: 'separator', name: '---', dialCode: '', flag: '' },
    ...countries.filter(country => !popularCountries.some(pop => pop.code === country.code))
  ];

  const handleCountrySelect = (dialCode: string) => {
    const country = countries.find(c => c.dialCode === dialCode);
    if (country) {
      onChange(dialCode, country);
    }
  };

  return (
    <Select value={value} onValueChange={handleCountrySelect} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          "w-[120px] gap-2 galax-input", 
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="text-sm font-medium text-gray-700 truncate">
            {selectedCountry.dialCode}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
      </SelectTrigger>
      <SelectContent className="w-[280px] max-h-[300px]">
        {/* Search box */}
        <div className="flex items-center border-b px-3 pb-2 mb-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            type="text"
            placeholder="Search countries..."
            className="flex-1 bg-transparent outline-none text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {displayCountries.map((country, index) => {
          // Render separator
          if (country.code === 'separator') {
            return (
              <div key="separator" className="border-t my-1 mx-2" />
            );
          }

          return (
            <SelectItem
              key={`${country.code}-${index}`}
              value={country.dialCode}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 w-full">
                <span className="text-lg flex-shrink-0" role="img" aria-label={country.name}>
                  {country.flag}
                </span>
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="text-sm truncate">{country.name}</span>
                  <span className="text-sm font-medium text-gray-500 ml-2 flex-shrink-0">
                    {country.dialCode}
                  </span>
                </div>
              </div>
            </SelectItem>
          );
        })}
        
        {filteredCountries.length === 0 && searchQuery && (
          <div className="text-center py-6 text-sm text-gray-500">
            No countries found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}