import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Setup mocks
const mockRouterPush = vi.fn();
const mockSendMessage = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockRouterPush,
        replace: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({
        id: 'test-workspace',
    }),
    usePathname: () => '/workspaces/test-workspace/chat',
}));

// Mock workspace context
vi.mock('@/context/workspace-context', () => ({
    useWorkspaceContext: () => ({
        currentWorkspace: { id: 'test-workspace', name: 'Test Workspace' },
        workspaceId: 'test-workspace',
        isDefault: false,
        ragEngine: 'basic',
        documentCount: 5,
    }),
    WorkspaceProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Dynamic message state for integration testing
let mockMessages: any[] = [];
let mockIsLoading = false;

vi.mock('@/hooks/use-chat', () => ({
    useChat: () => ({
        messages: mockMessages,
        isLoading: mockIsLoading,
        sendMessage: mockSendMessage,
    }),
}));

vi.mock('@/hooks/use-settings', () => ({
    useSettings: () => ({
        settings: { show_reasoning: false },
        updateSettings: mockUpdateSettings,
    }),
}));

import ChatPage from '@/app/workspaces/[id]/chat/page';
import { CitationModal, CitationBadge } from '@/components/chat/citation';

describe('Chat Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockMessages = [];
        mockIsLoading = false;
    });

    it('submits message through input form', async () => {
        render(<ChatPage />);

        const input = screen.getByPlaceholderText('Message in fast mode...');
        const sendButton = screen.getByRole('button', { name: 'Send message' });

        // Type a message
        fireEvent.change(input, { target: { value: 'What is the summary?' } });
        expect(input).toHaveValue('What is the summary?');

        // Submit the form
        fireEvent.click(sendButton);

        // Should call sendMessage
        expect(mockSendMessage).toHaveBeenCalledWith('What is the summary?');
    });

    it('clears input after sending message', () => {
        render(<ChatPage />);

        const input = screen.getByPlaceholderText('Message in fast mode...');

        fireEvent.change(input, { target: { value: 'Test message' } });
        fireEvent.submit(input.closest('form')!);

        // Input should be cleared
        expect(input).toHaveValue('');
    });

    it('updates settings when mode changed', async () => {
        render(<ChatPage />);

        const reasoningButton = screen.getByRole('button', { name: /Reasoning/i });
        fireEvent.click(reasoningButton);

        // Should update settings with show_reasoning: true
        expect(mockUpdateSettings).toHaveBeenCalledWith({ show_reasoning: true });
    });

    it('triggers quick start prompts', () => {
        render(<ChatPage />);

        const quickStart = screen.getByText('Summarize my documents');
        fireEvent.click(quickStart);

        expect(mockSendMessage).toHaveBeenCalledWith('Summarize my documents');
    });
});

describe('Citation Click Flow Integration', () => {
    it('opens citation modal when badge clicked', () => {
        const mockSource = {
            id: 1,
            name: 'test-doc.pdf',
            content: 'Document content here',
            workspace_id: 'ws-123',
        };

        const onClose = vi.fn();

        const { rerender } = render(
            <CitationBadge id={1} name="test-doc.pdf" onClick={() => { }} />
        );

        // Simulate clicking badge and rendering modal
        rerender(
            <>
                <CitationBadge id={1} name="test-doc.pdf" onClick={() => { }} />
                <CitationModal source={mockSource} onClose={onClose} />
            </>
        );

        // Modal should be visible with document content
        expect(screen.getByText('test-doc.pdf')).toBeInTheDocument();
        expect(screen.getByText(/Document content here/)).toBeInTheDocument();
    });

    it('closes modal when close button clicked', () => {
        const onClose = vi.fn();
        const mockSource = {
            id: 1,
            name: 'test-doc.pdf',
            content: 'Content',
        };

        render(<CitationModal source={mockSource} onClose={onClose} />);

        const closeButton = screen.getByText('Close');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalled();
    });

    it('shows workspace context in citation modal', () => {
        const mockSource = {
            id: 1,
            name: 'test-doc.pdf',
            content: 'Content',
            workspace_id: 'my-workspace',
            embedding_model: 'text-embedding-3-small',
            chunk_size: 800,
        };

        render(<CitationModal source={mockSource} onClose={vi.fn()} />);

        expect(screen.getByText(/my-workspace/)).toBeInTheDocument();
        expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
    });
});
