import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

// Import safely to avoid build issues
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
// Replace direct import with a dynamic approach for rehype-mathjax
// import rehypeMathjax from 'rehype-mathjax';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void;
  onRetry?: (messageIndex: number) => void;
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit, onRetry }) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content != messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const { messages } = selectedConversation;
    const findIndex = messages.findIndex((elm) => elm === message);

    if (findIndex < 0) return;

    if (
      findIndex < messages.length - 1 &&
      messages[findIndex + 1].role === 'assistant'
    ) {
      messages.splice(findIndex, 2);
    } else {
      messages.splice(findIndex, 1);
    }
    const updatedConversation = {
      ...selectedConversation,
      messages,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );
    homeDispatch({ field: 'selectedConversation', value: single });
    homeDispatch({ field: 'conversations', value: all });
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };

  useEffect(() => {
    setMessageContent(message.content);
  }, [message.content]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Error bubble: either starts with "Error:" or is a JSON error object
  if (
    message.role === 'assistant' &&
    (message.content.startsWith('Error:') ||
     message.content.trim().startsWith('{'))
  ) {
    let raw = message.content.replace(/^Error:\s*/, '');
    let text: string;
    try {
      const obj = JSON.parse(raw);
      text = obj.message || obj.error || raw;
    } catch {
      text = raw;
    }
    return (
      <div
        className={`group md:px-4 border-b border-black/10 bg-gray-50/90 text-gray-800
                    dark:border-gray-900/50 dark:bg-[#444654]/95 dark:text-gray-100`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
          <div className="min-w-[40px] text-right">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500/70 to-blue-500/70 text-white">
              <IconRobot size={20} stroke={2.5} />
            </div>
          </div>
          <div className="w-full flex justify-center">
            <div className="w-full max-w-md bg-red-50 border border-red-400 rounded-lg p-4 shadow-sm
                            dark:bg-red-900/20 dark:border-red-600">
              <p className="text-red-700 font-medium">{text}</p>
              <button
                className="mt-3 w-full inline-flex justify-center items-center
                           px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200
                           dark:bg-red-800/50 dark:text-red-300 dark:hover:bg-red-700/50
                           transition"
                onClick={() => onRetry?.(messageIndex)}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`group md:px-4 ${
        message.role === 'assistant'
          ? 'border-b border-black/10 bg-gray-50/90 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654]/95 dark:text-gray-100'
          : 'border-b border-black/10 bg-white/95 text-gray-800 dark:border-gray-900/50 dark:bg-[#343541]/95 dark:text-gray-100'
      }`}
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] text-right">
          {message.role === 'assistant' ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500/70 to-blue-500/70 text-white">
              <IconRobot size={20} stroke={2.5} />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-teal-500/70 to-green-500/70 text-white">
              <IconUser size={20} stroke={2.5} />
            </div>
          )}
        </div>

        <div className="prose mt-[-2px] w-full dark:prose-invert">
          {message.role === 'user' ? (
            <div className="flex w-full">
              {isEditing ? (
                <div className="flex w-full flex-col">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none whitespace-pre-wrap border-none rounded-md dark:bg-[#343541]/50 focus:ring-2 focus:ring-blue-500/50 p-2"
                    value={messageContent}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    onCompositionStart={() => setIsTyping(true)}
                    onCompositionEnd={() => setIsTyping(false)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      margin: '0',
                      overflow: 'hidden',
                    }}
                  />

                  <div className="mt-10 flex justify-center space-x-4">
                    <button
                      className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 shadow-sm"
                      onClick={handleEditMessage}
                      disabled={messageContent.trim().length <= 0}
                    >
                      {t('Save & Submit')}
                    </button>
                    <button
                      className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors duration-200"
                      onClick={() => {
                        setMessageContent(message.content);
                        setIsEditing(false);
                      }}
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose whitespace-pre-wrap dark:prose-invert flex-1">
                  {message.content}
                </div>
              )}

              {!isEditing && (
                <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={toggleEditing}
                  >
                    <IconEdit size={18} stroke={1.5} />
                  </button>
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={handleDeleteMessage}
                  >
                    <IconTrash size={18} stroke={1.5} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-row">
              <MemoizedReactMarkdown
                className="prose dark:prose-invert flex-1"
                remarkPlugins={[remarkGfm, remarkMath]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const childrenArray = Array.isArray(children) ? children : [children];
                    if (childrenArray.length) {
                      if (childrenArray[0] === '▍') {
                        return <span className="animate-pulse cursor-default mt-1">▍</span>
                      }

                      if (typeof childrenArray[0] === 'string') {
                        childrenArray[0] = childrenArray[0].replace("`▍`", "▍");
                      }
                    }

                    const match = /language-(\w+)/.exec(className || '');

                    return !inline ? (
                      <CodeBlock
                        key={Math.random()}
                        language={(match && match[1]) || ''}
                        value={String(children).replace(/\n$/, '')}
                        {...props}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return (
                      <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                        {children}
                      </table>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="break-words border border-black px-3 py-1 dark:border-white">
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {`${message.content}${
                  messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                }`}
              </MemoizedReactMarkdown>

              <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                {messagedCopied ? (
                  <div className="p-1 rounded-md bg-green-500/10 text-green-500 dark:text-green-400">
                    <IconCheck size={18} stroke={1.5} />
                  </div>
                ) : (
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={copyOnClick}
                  >
                    <IconCopy size={18} stroke={1.5} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
