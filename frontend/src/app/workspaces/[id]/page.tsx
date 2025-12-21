'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function WorkspaceRootPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    useEffect(() => {
        if (workspaceId) {
            router.replace(`/workspaces/${workspaceId}/chat`);
        }
    }, [workspaceId, router]);

    return (
        <div className="h-screen w-full bg-[#0a0a0b] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <span className="text-gray-500 text-sm font-black uppercase tracking-widest animate-pulse">Routing to Workspace Hub...</span>
            </div>
        </div>
    );
}
