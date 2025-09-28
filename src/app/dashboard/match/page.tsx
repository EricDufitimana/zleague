'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Championship {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

export default function MatchIndexPage() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedChampionship, setSelectedChampionship] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchChampionships();
  }, []);

  useEffect(() => {
    if (selectedChampionship) {
      // Navigate to the dynamic route when a championship is selected
      router.push(`/dashboard/match/${selectedChampionship}`);
    }
  }, [selectedChampionship, router]);

  const fetchChampionships = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/championships');
      if (response.ok) {
        const data = await response.json();
        setChampionships(data);
      }
    } catch (error) {
      console.error('Error fetching championships:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-3">
      {/* Page Header with Championship Filter */}
      <div className="flex items-center justify-between">
        <div className="text-right flex items-start flex-col">
          <h1 className="text-2xl font-bold text-gray-900 text-right">Match Generator</h1>
          <p className="text-gray-600 mt-2">Select a championship to start creating matchups</p>
        </div>
        
        <div className="flex flex-col items-start gap-2">
          <Label htmlFor="championship" className="text-sm font-medium">Championship</Label>
          <Select value={selectedChampionship} onValueChange={setSelectedChampionship}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Choose a championship" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>
                  Loading championships...
                </SelectItem>
              ) : championships.length === 0 ? (
                <SelectItem value="no-data" disabled>
                  No championships available
                </SelectItem>
              ) : (
                championships.map((championship) => (
                  <SelectItem key={championship.id} value={championship.id.toString()}>
                    {championship.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}