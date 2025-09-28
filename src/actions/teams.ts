'use server'

import { createClient } from '@supabase/supabase-js'

export interface TeamData {
  name: string
  grade: string
  gender?: string
}

export async function updateTeam(teamId: number, teamData: TeamData) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('teams')
      .update({
        name: teamData.name.trim(),
        grade: teamData.grade,
        gender: teamData.gender || null,
      })
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to update team: ${error.message}`
      }
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to update team: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export async function deleteTeam(teamId: number) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First check if team has any players
    const { count: playerCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    if (playerCount && playerCount > 0) {
      return {
        success: false,
        error: `Cannot delete team: Team has ${playerCount} player(s). Please remove all players first.`
      }
    }

    // Check if team is involved in any matches
    const { count: matchCountA } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('team_a_id', teamId)

    const { count: matchCountB } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('team_b_id', teamId)

    const totalMatches = (matchCountA || 0) + (matchCountB || 0)

    if (totalMatches > 0) {
      return {
        success: false,
        error: `Cannot delete team: Team is involved in ${totalMatches} match(es). Please remove from matches first.`
      }
    }

    // Delete the team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      return {
        success: false,
        error: `Failed to delete team: ${error.message}`
      }
    }

    return {
      success: true,
      message: 'Team deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete team: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export async function getTeamById(teamId: number) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to fetch team: ${error.message}`
      }
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch team: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
