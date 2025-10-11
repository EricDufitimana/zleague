'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X } from 'lucide-react';

// Families organized by grade
const FAMILIES_BY_GRADE = {
  'ey': [
    'Family_1',
    'Family_2', 
    'Family_3',
    'Family_4',
    'Family_5',
    'Family_6'
  ],
  's4': [
    'Thomas Edison',
    'Rosalie Gicanda',
    'Lance Solomon Reddick',
    'Niyitegeka Felestin',
    'Irena Sendler',
    'ADA loveloce'
  ],
  's5': [
    'Pelé (Edson Arantes Do Nascimento)',
    'Ubald Rugirangoga',
    'Alfred Nobel',
    'Toni Morrison',
    'Ruth Bader Ginsberg',
    'Charles Babbage'
  ],
  's6': [
    'KATHERINE JOHNSON',
    'YVAN BURAVAN', 
    'Chinua Achebe',
    'RUGANZU NDOLI 2',
    'AOUA KEITA',
    'Fannie Lou Hamer'
  ]
};

interface FamilySelectorProps {
  selectedFamilies: string[];
  onFamiliesChange: (families: string[]) => void;
  playersByFamily?: { [family: string]: number };
  disabled?: boolean;
  isLoading?: boolean;
}

export function FamilySelector({ 
  selectedFamilies, 
  onFamiliesChange, 
  playersByFamily = {},
  disabled = false,
  isLoading = false
}: FamilySelectorProps) {
  const [selectAll, setSelectAll] = useState(false);

  // Get all families from all grades
  const allFamilies = Object.values(FAMILIES_BY_GRADE).flat();

  const handleFamilyToggle = (family: string) => {
    if (disabled) return;
    
    if (selectedFamilies.includes(family)) {
      onFamiliesChange(selectedFamilies.filter(f => f !== family));
    } else {
      onFamiliesChange([...selectedFamilies, family]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    
    if (selectAll) {
      onFamiliesChange([]);
      setSelectAll(false);
    } else {
      onFamiliesChange(allFamilies);
      setSelectAll(true);
    }
  };

  const handleSelectNone = () => {
    if (disabled) return;
    
    onFamiliesChange([]);
    setSelectAll(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Families</h3>
          <p className="text-sm text-muted-foreground">
            Choose families from all grades to create teams
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={disabled}
          >
            <Check className="size-4 mr-2" />
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNone}
            disabled={disabled}
          >
            <X className="size-4 mr-2" />
            Select None
          </Button>
        </div>
      </div>

      {/* All Families with Grade Indicators */}
      <div className="space-y-4">
        {Object.entries(FAMILIES_BY_GRADE).map(([grade, families]) => (
          <div key={grade} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {grade.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {families.length} families
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {families.map((family) => {
                const isSelected = selectedFamilies.includes(family);
                const playerCount = playersByFamily[family] || 0;
                
                return (
                  <Card 
                    key={family}
                    className={`cursor-pointer transition-all hover:shadow-sm p-2 ${
                      isSelected 
                        ? 'ring-1 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => handleFamilyToggle(family)}
                  >
                    <div className="flex items-center space-x-1">
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => handleFamilyToggle(family)}
                        disabled={disabled}
                        className="h-3 w-3"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" title={family}>
                          {family}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-2" />
                          {isLoading ? (
                            <div className="flex gap-0.5">
                              <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 bg-muted-foreground/60 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <span>{playerCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedFamilies.length > 0 && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="size-4 text-primary" />
            <span className="text-sm font-medium">
              {selectedFamilies.length} families selected
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Teams will be created for each selected family
          </p>
        </div>
      )}
    </div>
  );
}
