"use server";

import { prisma } from "@/lib/prisma";

export async function updateChampionship(championshipId: number, name: string) {
    try {
        const result = await prisma.championships.update({
            where: {
                id: championshipId
            },
            data: {
                name: name.trim()
            }
        });

        return {
            success: true,
            message: "Championship Updated Successfully",
            data: result
        };
    } catch (error) {
        console.error("Error Updating Championship:", error);
        return {
            success: false,
            message: "Failed To Update Championship"
        };
    }
}

