"use client"
import { SocketContextProvider } from "@/context/socket-context";
import { ToastProvider } from "@/context/toast-context";
import { AudioProvider } from "@/store/audioStore";
import { SessionProvider } from "next-auth/react";
import React from "react";


export function Providers({children}: {
    children : React.ReactNode
}){
    return <SessionProvider>
        <ToastProvider>
            <SocketContextProvider> 
                <AudioProvider>{children}</AudioProvider> 
            </SocketContextProvider>
        </ToastProvider>
    </SessionProvider>
}