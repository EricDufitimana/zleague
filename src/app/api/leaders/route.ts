import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'football';
    const gender = searchParams.get('gender') || 'all';

    let leaderboardData: any[] = [];

    if (sport === 'football') {
      // Build query - only include scores from ongoing championships
      let query = supabase
        .from('football_scores')
        .select(`
          player_id,
          goals,
          assists,
          shots_on_target,
          saves,
          player:players(first_name, last_name),
          team:teams(name, gender),
          match:matches!match_id(
            championship:championships(status)
          )
        `)
        .eq('match.championship.status', 'ongoing');

      // Apply gender filter if needed
      if (gender !== 'all') {
        query = query.eq('team.gender', gender);
      }

      const { data: scores, error } = await query;

      if (error) throw error;

      // Group by player and aggregate stats
      const playerStats = new Map<string, any>();

      scores?.forEach((score: any) => {
        const playerId = score.player_id.toString();
        
        if (!playerStats.has(playerId) && score.player) {
          playerStats.set(playerId, {
            id: score.player_id,
            name: `${score.player.first_name} ${score.player.last_name}`,
            team: score.team.name.replace(/_/g, ' '),
            goals: 0,
            assists: 0,
            shotsOnTarget: 0,
            saves: 0,
            gamesPlayed: 0,
          });
        }

        const stats = playerStats.get(playerId);
        if (stats) {
          stats.goals += Number(score.goals);
          stats.assists += Number(score.assists);
          stats.shotsOnTarget += Number(score.shots_on_target || 0);
          stats.saves += Number(score.saves || 0);
          stats.gamesPlayed += 1;
        }
      });

      // Convert to array and sort by goals (default)
      leaderboardData = Array.from(playerStats.values());
      leaderboardData.sort((a, b) => b.goals - a.goals || b.assists - a.assists);

    } else if (sport === 'basketball') {
      // Build query - only include scores from ongoing championships
      let query = supabase
        .from('basketball_scores')
        .select(`
          player_id,
          points,
          rebounds,
          assists,
          three_points_made,
          three_points_attempted,
          player:players(first_name, last_name),
          team:teams(name, gender),
          match:matches!match_id(
            championship:championships(status)
          )
        `)
        .eq('match.championship.status', 'ongoing');

      // Apply gender filter if needed
      if (gender !== 'all') {
        query = query.eq('team.gender', gender);
      }

      const { data: scores, error } = await query;

      if (error) throw error;

      // Group by player and aggregate stats
      const playerStats = new Map<string, any>();

      scores?.forEach((score: any) => {
        const playerId = score.player_id?.toString();
        
        if (!playerId || !score.player) return;

        if (!playerStats.has(playerId)) {
          playerStats.set(playerId, {
            id: score.player_id,
            name: `${score.player.first_name} ${score.player.last_name}`,
            team: score.team.name.replace(/_/g, ' '),
            points: 0,
            rebounds: 0,
            assists: 0,
            threePointsMade: 0,
            threePointsAttempted: 0,
            gamesPlayed: 0,
          });
        }

        const stats = playerStats.get(playerId);
        stats.points += Number(score.points);
        stats.rebounds += Number(score.rebounds);
        stats.assists += Number(score.assists);
        stats.threePointsMade += Number(score.three_points_made || 0);
        stats.threePointsAttempted += Number(score.three_points_attempted || 0);
        stats.gamesPlayed += 1;
      });

      // Convert to array and sort by points (default)
      leaderboardData = Array.from(playerStats.values());
      leaderboardData.sort((a, b) => b.points - a.points || b.assists - a.assists);
    }

    // Add rank and calculate averages for basketball
    const rankedData = leaderboardData.map((player, index) => {
      const baseData = {
        ...player,
        rank: index + 1,
        avatar: '', // You can add avatar URLs if you have them in the database
      };

      // Calculate per-game averages for basketball
      if (sport === 'basketball' && player.gamesPlayed > 0) {
        return {
          ...baseData,
          ppg: (player.points / player.gamesPlayed).toFixed(1),
          rpg: (player.rebounds / player.gamesPlayed).toFixed(1),
          apg: (player.assists / player.gamesPlayed).toFixed(1),
          threePointsPerGame: (player.threePointsMade / player.gamesPlayed).toFixed(1),
          threePointPercentage: player.threePointsAttempted > 0 
            ? ((player.threePointsMade / player.threePointsAttempted) * 100).toFixed(1)
            : '0.0',
        };
      }

      // Calculate per-game averages for football
      if (sport === 'football' && player.gamesPlayed > 0) {
        return {
          ...baseData,
          goalsPerGame: (player.goals / player.gamesPlayed).toFixed(1),
          assistsPerGame: (player.assists / player.gamesPlayed).toFixed(1),
          shotsOnTargetPerGame: (player.shotsOnTarget / player.gamesPlayed).toFixed(1),
          savesPerGame: (player.saves / player.gamesPlayed).toFixed(1),
        };
      }

      return baseData;
    });

    return NextResponse.json({
      success: true,
      sport,
      gender,
      leaders: rankedData,
    });
  } catch (error) {
    console.error('Error fetching leaders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leaderboard data',
        leaders: []
      },
      { status: 500 }
    );
  }
}

