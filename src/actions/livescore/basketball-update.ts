"use server";
import { prisma } from "@/lib/prisma";
import { requireEditableMatch } from '@/lib/match-write-guard';

function serializeBigInt(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export async function createMultipleBasketballScores(
  matchId: string,
  players: Array<{
    teamId: string;
    playerId: string;
  }>
) {
  try {
    await requireEditableMatch(matchId);
    console.log('🏀 createMultipleBasketballScores called with:', {
      matchId,
      playersCount: players.length,
      players: players.map(p => ({ teamId: p.teamId, playerId: p.playerId }))
    });

    const dataToCreate = players.map(player => ({
      match_id: BigInt(matchId),
      team_id: BigInt(player.teamId),
      player_id: BigInt(player.playerId),
      points: 0,
      rebounds: 0,
      assists: 0,
      created_at: new Date(),
    }));

    console.log('🏀 Data to create:', dataToCreate);

    const scores = await prisma.basketball_scores.createMany({
      data: dataToCreate,
    });

    console.log('🏀 createMany result:', scores);

    // ✅ Return plain object, not NextResponse
    return { success: true, data: { count: scores.count } };
  } catch (error) {
    console.error('🏀 Error in createMultipleBasketballScores:', error);
    console.error('🏀 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    // ✅ Return plain object for errors too
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function updateBasketballScore(
  matchId: string,
  teamId: string,
  playerId: string,
  points: number,
  rebounds: number,
  assists: number,
) {
  try {
    const editable = await requireEditableMatch(matchId);
    if (editable.status === 'played') throw new Error('This match is finished. Edit its result from Record Results.');
    console.log('🏀 updateBasketballScore called with:', {
      matchId,
      teamId,
      playerId,
      points,
      rebounds,
      assists,
    });

    const currentScore = await prisma.basketball_scores.findFirst({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
    });

    console.log('🏀 Current score found:', currentScore);

    if (!currentScore) {
      console.error('🏀 Player score not found for:', { matchId, teamId, playerId });
      throw new Error("Player score not found");
    }

    const newPoints = Number(currentScore.points) + points;
    const newRebounds = Number(currentScore.rebounds) + rebounds;
    const newAssists = Number(currentScore.assists) + assists;

    console.log('🏀 Updating player stats:', {
      current: {
        points: currentScore.points,
        rebounds: currentScore.rebounds,
        assists: currentScore.assists,
      },
    });

    const updateResult = await prisma.basketball_scores.updateMany({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
      data: {
        points: newPoints,
        rebounds: newRebounds,
        assists: newAssists,
      },
    });

    // Get the updated score for response
    const score = await prisma.basketball_scores.findFirst({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
    });

    console.log('🏀 Player score updated:', score);

    const match = await prisma.matches.findUnique({
      where: { id: BigInt(matchId) },
    });

    console.log('🏀 Match found:', match);

    if (!match) {
      console.error('🏀 Match not found for ID:', matchId);
      throw new Error("Match not found");
    }

    const allScores = await prisma.basketball_scores.findMany({
      where: { match_id: BigInt(matchId) },
    });

    console.log('🏀 All scores for match:', allScores);

    const teamATotal = allScores
      .filter((s) => s.team_id === match.team_a_id)
      .reduce((sum, s) => sum + Number(s.points), 0);

    const teamBTotal = allScores
      .filter((s) => s.team_id === match.team_b_id)
      .reduce((sum, s) => sum + Number(s.points), 0);

    console.log('🏀 Calculated team totals:', {
      teamATotal,
      teamBTotal,
      matchTeamA: match.team_a_id,
      matchTeamB: match.team_b_id
    });

    await prisma.matches.update({
      where: { id: BigInt(matchId) },
      data: {
        team_a_score: teamATotal,
        team_b_score: teamBTotal,
      },
    });

    console.log('🏀 Match scores updated successfully');

    // ✅ Return plain serialized object
    return { 
      success: true, 
      data: serializeBigInt({ 
        playerScore: score, 
        matchScore: { teamA: teamATotal, teamB: teamBTotal } 
      })
    };
  } catch (error) {
    console.error('🏀 Error in updateBasketballScore:', error);
    console.error('🏀 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    // ✅ Return plain object for errors
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
