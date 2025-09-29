import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

interface userData{
    userId:string | null;
    isLoading: boolean | null;
    error: string | null;
}

export function useUserData(){
    const [userData, setUserData] = useState<userData>({
        userId: null,
        isLoading:true,
        error: null, 
    })

    const fetchUserData = useCallback(async () =>{
        try{
            const supabase = createClient()

            const {data: user, error: userError} = await supabase.auth.getUser();

            if(userError){
                setUserData((prev:userData) => ({...prev,isLoading:false,error:userError.message}))
                console.error("Error fetching user data:", userError.message)
                return;
            }

            if(!user){
                setUserData((prev:userData) => ({...prev, isLoading:false, error: "User not found"}))
                console.error("User not found")
                return;
            }

            const userId = user.user?.id;

            console.log("User ID:", userId)

            if(userId){
                setUserData((prev:userData)=> ({...prev, isLoading:false, userId}))
                console.log("User ID set:", userId)
                return;
            }

            setUserData((prev:userData)=> ({...prev, isLoading:false, error: "User ID not found"}))
            console.error("User ID not found")
            return;

        }catch(error){
            setUserData((prev:userData)=> ({...prev, isLoading:false, error: "Error fetching user data"}))
            console.error("Error fetching user data:", error)
            return;
        }
    }, [])

    const initializeUserData = useCallback(async () => {
        try{
            setUserData((prev:userData) => ({...prev, isLoading:true, error: null}))
            await fetchUserData();
        }catch(error){
            setUserData((prev:userData)=> ({...prev, isLoading:false, error: "Error initializing user data"}))
            console.error("Error initializing user data:", error)
            return;
        }
    }, [fetchUserData])

    useEffect(() => {
        initializeUserData();
    }, [initializeUserData]);

    const refreshUserData = () => {
        initializeUserData();
    }

    return {
        ...userData,
        refreshUserData
    }
}


            