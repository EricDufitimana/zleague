import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    try{
        const body = await request.json();
        const { user_id } = body;

        if(!user_id){
            console.log("No user ID provided")
            return NextResponse.json({error: 'User ID is required'}, {status: 400});
        }

        console.log("User ID provided:", user_id);

        // Use admin client to get full user details and create admin record
        const adminSupabase = createAdminClient();
        const {data: user, error: userError} = await adminSupabase.auth.admin.getUserById(user_id);

        if(userError){
            console.error("Error fetching user:", userError);
            return NextResponse.json({error: 'Error fetching user'}, {status: 500});
        }

        // Use the SQL function to insert admin record (bypasses RLS)
        const {data: admin, error: adminError} = await adminSupabase
            .rpc('insert_admin_record', {
                p_user_id: user.user.id,
                p_first_name: user.user.user_metadata.first_name || 'Unknown',
                p_last_name: user.user.user_metadata.last_name || 'User'
            });

        if(adminError){
            console.error("Error fetching admin:", adminError);
            return NextResponse.json({error: 'Error fetching admin'}, {status: 500});
        }
        
        console.log("Admin created successfully:", admin);

        return NextResponse.json({message: 'Admin created successfully'}, {status: 200});
    } catch (error) {
        console.error("Error in auth callback:", error);
        return NextResponse.json({error: 'Error in auth callback'}, {status: 500});
    }
}