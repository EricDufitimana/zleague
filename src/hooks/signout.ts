"use server"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export async function signOut() {
  try{ 
    const supabase = await createClient()
    await supabase.auth.signOut()
    return { success: true }
  }catch(error){
    console.error("Error signing out:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }finally{
    redirect("/")
  }
}