"use server";
import { prisma } from "@/lib/prisma";

function serializeBigInt(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

export async function createMultipleFootballScores(
  matchId: string,
  players: Array<{
    teamId: string;
    playerId: string;
  }>
) {
  try {
    console.log('⚽ createMultipleFootballScores called with:', {
      matchId,
      playersCount: players.length,
      players: players.map(p => ({ teamId: p.teamId, playerId: p.playerId }))
    });

    const dataToCreate = players.map(player => ({
      match_id: BigInt(matchId),
      team_id: BigInt(player.teamId),
      player_id: BigInt(player.playerId),
      goals: 0,
      assists: 0,
      shots_on_target: 0,
      saves: 0,
      created_at: new Date(),
    }));

    console.log('⚽ Data to create:', dataToCreate);

    const scores = await prisma.football_scores.createMany({
      data: dataToCreate,
    });

    console.log('⚽ createMany result:', scores);

    return { success: true, data: { count: scores.count } };
  } catch (error) {
    console.error('⚽ Error in createMultipleFootballScores:', error);
    console.error('⚽ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function updateFootballScore(
  matchId: string,
  teamId: string,
  playerId: string,
  goals: number,
  assists: number,
  shotsOnTarget: number,
  saves: number
) {
  try {
    console.log('⚽ updateFootballScore called with:', {
      matchId,
      teamId,
      playerId,
      goals,
      assists,
      shotsOnTarget,
      saves
    });

    const currentScore = await prisma.football_scores.findFirst({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
    });

    console.log('⚽ Current score found:', currentScore);

    if (!currentScore) {
      console.error('⚽ Player score not found for:', { matchId, teamId, playerId });
      throw new Error("Player score not found");
    }

    const newGoals = Number(currentScore.goals) + goals;
    const newAssists = Number(currentScore.assists) + assists;
    const newShotsOnTarget = Number(currentScore.shots_on_target) + shotsOnTarget;
    const newSaves = Number(currentScore.saves) + saves;

    console.log('⚽ Updating player stats:', {
      current: {
        goals: currentScore.goals,
        assists: currentScore.assists,
        shots_on_target: currentScore.shots_on_target,
        saves: currentScore.saves
      },
      increment: { goals, assists, shotsOnTarget, saves },
      new: { newGoals, newAssists, newShotsOnTarget, newSaves }
    });

    const updateResult = await prisma.football_scores.updateMany({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
      data: {
        goals: newGoals,
        assists: newAssists,
        shots_on_target: newShotsOnTarget,
        saves: newSaves,
      },
    });

    // Get the updated score for response
    const score = await prisma.football_scores.findFirst({
      where: {
        match_id: BigInt(matchId),
        team_id: BigInt(teamId),
        player_id: BigInt(playerId),
      },
    });

    console.log('⚽ Player score updated:', score);

    const match = await prisma.matches.findUnique({
      where: { id: BigInt(matchId) },
    });

    console.log('⚽ Match found:', match);

    if (!match) {
      console.error('⚽ Match not found for ID:', matchId);
      throw new Error("Match not found");
    }

    const allScores = await prisma.football_scores.findMany({
      where: { match_id: BigInt(matchId) },
    });

    console.log('⚽ All scores for match:', allScores);

    const teamATotal = allScores
      .filter((s) => s.team_id === match.team_a_id)
      .reduce((sum, s) => sum + Number(s.goals), 0);

    const teamBTotal = allScores
      .filter((s) => s.team_id === match.team_b_id)
      .reduce((sum, s) => sum + Number(s.goals), 0);

    console.log('⚽ Calculated team totals:', {
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

    console.log('⚽ Match scores updated successfully');

    return { 
      success: true, 
      data: serializeBigInt({ 
        playerScore: score, 
        matchScore: { teamA: teamATotal, teamB: teamBTotal } 
      })
    };
  } catch (error) {
    console.error('⚽ Error in updateFootballScore:', error);
    console.error('⚽ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

