'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X } from 'lucide-react';

import {
  GRADE_LABELS,
  SELECTABLE_GRADES,
  type Family,
} from '@/lib/grades';

interface FamilySelectorProps {
  /** Families to offer, loaded from /api/families by the parent. */
  families: Family[];
  selectedFamilies: string[];
  onFamiliesChange: (families: string[]) => void;
  playersByFamily?: { [family: string]: number };
  disabled?: boolean;
  isLoading?: boolean;
}

export function FamilySelector({ 
  families,
  selectedFamilies, 
  onFamiliesChange, 
  playersByFamily = {},
  disabled = false,
  isLoading = false
}: FamilySelectorProps) {
  const [selectAll, setSelectAll] = useState(false);

  // Families come from the database (see /dashboard/families); only grades that
  // currently have one are offered, and alumni have graduated out.
  const gradesToShow = SELECTABLE_GRADES
    .map(grade => [grade, families.filter(f => f.grade === grade)] as const)
    .filter(([, list]) => list.length > 0);

  const allFamilies = gradesToShow.flatMap(([, list]) => list.map(f => f.name));

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
      {gradesToShow.length === 0 && !isLoading && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">No families configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add them under Dashboard → Families.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {gradesToShow.map(([grade, list]) => (
          <div key={grade} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium">
                {GRADE_LABELS[grade]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {list.length} families
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {list.map((entry) => {
                const family = entry.name;
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
