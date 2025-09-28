"use server";

import { prisma } from "@/lib/prisma";

export async function deleteMatchup(matchupId: number) {
    try {
        const result = await prisma.matches.delete({
            where: {
                id: matchupId
            }
        });

        return {
            success: true,
            message: "Matchup Deleted Successfully",
            data: result
        };
    } catch (error) {
        console.error("Error Deleting Matchup:", error);
        return {
            success: false,
            message: "Failed To Delete Matchup"
        };
    }
}

