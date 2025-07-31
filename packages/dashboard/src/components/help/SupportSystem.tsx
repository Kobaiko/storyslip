import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Bot,
  X,
  Minimize2,
  Maximize2,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Star,
  Flag,
  Archive
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'waiting-for-customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: SupportMessage[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  rating?: number;
  tags: string[];
}

interface SupportMessage {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'system';
  senderName: string;
  timestamp: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  isInternal?: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot' | 'agent';
  timestamp: string;
  isTyping?: boolean;
  suggestions?: string[];
}

interface SupportSystemProps {
  className?: string;
}

export function SupportSystem({ className = '' }: SupportSystemProps) {
  const [activeView, setActiveView] = useState<'chat' | 'tickets'>('chat');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeView === 'tickets') {
      loadTickets();
    }
  }, [activeView]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/support/tickets');
      setTickets(response.data);
    } catch (error) {
      console.error('Failed to load tickets:', error);
      // Load fallback data
      setTickets([
        {
          id: '1',
          subject: 'Widget not displaying correctly',
          description: 'The widget appears broken on my website after the latest update.',
          status: 'open',
          priority: 'high',
          category: 'technical',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z',
          messages: [
            {
              id: '1',
              content: 'The widget appears broken on my website after the latest update.',
              sender: 'user',
              senderName: 'John Doe',
              timestamp: '2024-01-15T10:30:00Z'
            },
            {
              id: '2',
              content: 'Thank you for reporting this issue. Can you please share your website URL and the widget embed code?',
              sender: 'agent',
              senderName: 'Sarah Support',
              timestamp: '2024-01-15T14:20:00Z'
            }
          ],
          attachments: [],
          tags: ['widget', 'display-issue']
        },
        {
          id: '2',
          subject: 'How to customize widget colors?',
          description: 'I need help changing the widget colors to match my brand.',
          status: 'resolved',
          priority: 'medium',
          category: 'customization',
          createdAt: '2024-01-14T09:15:00Z',
          updatedAt: '2024-01-14T16:45:00Z',
          messages: [
            {
              id: '3',
              content: 'I need help changing the widget colors to match my brand.',
              sender: 'user',
              senderName: 'Jane Smith',
              timestamp: '2024-01-14T09:15:00Z'
            },
            {
              id: '4',
              content: 'You can customize widget colors in the Widget Customization section of your dashboard. Here\'s a step-by-step guide...',
              sender: 'agent',
              senderName: 'Mike Support',
              timestamp: '2024-01-14T16:45:00Z'
            }
          ],
          attachments: [],
          rating: 5,
          tags: ['customization', 'colors']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Support</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant={activeView === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('chat')}
              leftIcon={<MessageCircle className="h-4 w-4" />}
            >
              Live Chat
            </Button>
            <Button
              variant={activeView === 'tickets' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('tickets')}
              leftIcon={<Mail className="h-4 w-4" />}
            >
              Support Tickets
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'chat' ? (
          <LiveChatInterface />
        ) : selectedTicket ? (
          <TicketView 
            ticket={selectedTicket} 
            onBack={() => setSelectedTicket(null)}
            onUpdate={loadTickets}
          />
        ) : (
          <TicketsList 
            tickets={tickets} 
            onSelectTicket={setSelectedTicket}
            onRefresh={loadTickets}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

function LiveChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [agentInfo, setAgentInfo] = useState<{ name: string; avatar: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat
    initializeChat();
    
    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      addMessage({
        id: Date.now().toString(),
        content: `Hi ${user?.name}! I'm here to help you with any questions about StorySlip. How can I assist you today?`,
        sender: 'bot',
        timestamp: new Date().toISOString()
      });
    }, 1000);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = () => {
    setMessages([
      {
        id: '1',
        content: 'Welcome to StorySlip Support! We\'ll connect you with an agent shortly.',
        sender: 'bot',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setNewMessage('');
    setIsTyping(true);

    try {
      // Send message to support API
      const response = await api.post('/support/chat/message', {
        content: newMessage,
        timestamp: new Date().toISOString()
      });

      // Simulate agent response
      setTimeout(() => {
        setIsTyping(false);
        addMessage({
          id: (Date.now() + 1).toString(),
          content: response.data.reply || 'Thank you for your message. An agent will respond shortly.',
          sender: 'agent',
          timestamp: new Date().toISOString()
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      
      // Fallback response
      setTimeout(() => {
        addMessage({
          id: (Date.now() + 1).toString(),
          content: 'I understand you need help. Let me connect you with a human agent who can better assist you.',
          sender: 'bot',
          timestamp: new Date().toISOString(),
          suggestions: [
            'Create a support ticket',
            'View documentation',
            'Schedule a call'
          ]
        });
      }, 1500);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <h3 className="font-medium text-gray-900">
                {agentInfo ? agentInfo.name : 'StorySlip Support'}
              </h3>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" leftIcon={<Phone className="h-4 w-4" />}>
              Call
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Mail className="h-4 w-4" />}>
              Email
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
        
        {isTyping && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-gray-600" />
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <Button size="sm" leftIcon={<Paperclip className="h-4 w-4" />} variant="outline">
            Attach
          </Button>
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : message.sender === 'bot' ? 'bg-gray-100' : 'bg-green-100'
        }`}>
          {isUser ? (
            <User className="h-4 w-4 text-white" />
          ) : message.sender === 'bot' ? (
            <Bot className="h-4 w-4 text-gray-600" />
          ) : (
            <User className="h-4 w-4 text-green-600" />
          )}
        </div>
        
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message.content}</p>
          <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </p>
          
          {message.suggestions && (
            <div className="mt-2 space-y-1">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {}}
                  className="block w-full text-left text-xs bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-2 py-1 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketsList({ 
  tickets, 
  onSelectTicket, 
  onRefresh, 
  isLoading 
}: { 
  tickets: SupportTicket[]; 
  onSelectTicket: (ticket: SupportTicket) => void;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting-for-customer': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery && !ticket.subject.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Support Tickets</h3>
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Ticket
          </Button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="waiting-for-customer">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <Button variant="outline" onClick={onRefresh} leftIcon={<Filter className="h-4 w-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                    {ticket.subject}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(ticket.status)}>
                      {ticket.status.replace('-', ' ')}
                    </Badge>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {ticket.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>#{ticket.id}</span>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                    <span>{ticket.messages.length} messages</span>
                  </div>
                  
                  {ticket.rating && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      {ticket.rating}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketView({ 
  ticket, 
  onBack, 
  onUpdate 
}: { 
  ticket: SupportTicket; 
  onBack: () => void;
  onUpdate: () => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [ticket.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/support/tickets/${ticket.id}/messages`, {
        content: newMessage
      });
      
      setNewMessage('');
      onUpdate();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting-for-customer': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back to Tickets
          </Button>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" leftIcon={<MoreVertical className="h-4 w-4" />}>
              Actions
            </Button>
          </div>
        </div>
        
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {ticket.subject}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Ticket #{ticket.id}</span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Created {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Updated {new Date(ticket.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(ticket.status)}>
              {ticket.status.replace('-', ' ')}
            </Badge>
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-2xl ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {message.senderName}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div className={`rounded-lg px-4 py-3 ${
                message.sender === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : message.sender === 'system'
                  ? 'bg-gray-100 text-gray-700 border border-gray-200'
                  : 'bg-gray-50 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {ticket.status !== 'closed' && (
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" leftIcon={<Paperclip className="h-4 w-4" />}>
                Attach File
              </Button>
              
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}