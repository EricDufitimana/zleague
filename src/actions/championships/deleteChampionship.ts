"use server";

import { prisma } from "@/lib/prisma";

export async function deleteChampionship(championshipId: number){
    try{
        const result = await prisma.championships.delete({
            where: {
                id: championshipId
            }
        })

        return {
            success: true,
            message: "Championship Deleted Successfully"
        }
    }catch(error){
        console.error("Error Deleting Championship:", error);
        return {
            success: false,
            message: "Failed To Delete Championship"
        }
    }
}


