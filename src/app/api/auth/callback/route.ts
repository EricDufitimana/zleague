import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    try{
        const body = await request.json();
        const { user_id, metadata } = body;

        if(!user_id){
            console.log("No user ID provided")
            return NextResponse.json({error: 'User ID is required'}, {status: 400});
        }

        console.log("User ID provided:", user_id);
        console.log("Metadata provided:", metadata);

        // Use admin client to get full user details and create admin record
        const adminSupabase = createAdminClient();
        const {data: user, error: userError} = await adminSupabase.auth.admin.getUserById(user_id);

        if(userError){
            console.error("Error fetching user:", userError);
            return NextResponse.json({error: 'Error fetching user'}, {status: 500});
        }

        // If metadata was provided from registration form, update user metadata
        if (metadata && (metadata.first_name || metadata.last_name || metadata.username)) {
            console.log("Updating user metadata with registration info...");
            const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
                user_id,
                {
                    user_metadata: {
                        ...user.user.user_metadata,
                        first_name: metadata.first_name || user.user.user_metadata.first_name,
                        last_name: metadata.last_name || user.user.user_metadata.last_name,
                        username: metadata.username || user.user.user_metadata.username,
                    }
                }
            );

            if (updateError) {
                console.error("Error updating user metadata:", updateError);
                // Continue anyway, don't fail the whole process
            } else {
                console.log("User metadata updated successfully");
            }
        }

        // Extract first and last name - prioritize registration form data
        let firstName = 'Unknown';
        let lastName = 'User';

        if (metadata?.first_name) {
            // Use data from registration form
            firstName = metadata.first_name;
            lastName = metadata.last_name || 'User';
        } else if (user.user.user_metadata.first_name) {
            // Use data from user metadata (could be from Google)
            firstName = user.user.user_metadata.first_name;
            lastName = user.user.user_metadata.last_name || 'User';
        } else if (user.user.user_metadata.given_name) {
            // Fallback to Google OAuth fields
            firstName = user.user.user_metadata.given_name;
            lastName = user.user.user_metadata.family_name || 'User';
        } else if (user.user.user_metadata.full_name) {
            // Last resort: parse full_name
            const nameParts = user.user.user_metadata.full_name.trim().split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ') || 'User';
        }

        // Insert into users table
        const {data: newUser, error: insertError} = await adminSupabase
            .from('users')
            .insert({
                user_id: user.user.id,
                first_name: firstName,
                last_name: lastName,
                username: metadata?.username || null
            })
            .select()
            .single();

        if(insertError){
            // Check if user already exists
            if (insertError.code === '23505') { // Unique violation
                console.log("User already exists in users table");
                return NextResponse.json({message: 'User already exists'}, {status: 200});
            }
            console.error("Error creating user:", insertError);
            return NextResponse.json({error: 'Error creating user'}, {status: 500});
        }
        
        console.log("User created successfully:", newUser);

        return NextResponse.json({message: 'User created successfully', user: newUser}, {status: 200});
    } catch (error) {
        console.error("Error in auth callback:", error);
        return NextResponse.json({error: 'Error in auth callback'}, {status: 500});
    }
}