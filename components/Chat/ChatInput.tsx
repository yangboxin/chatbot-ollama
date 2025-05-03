import {
  IconArrowDown,
  IconBolt,
  IconPlayerStop,
  IconRepeat,
  IconSend,
  IconCheck,
  IconFile,
} from '@tabler/icons-react';
import {
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { v4 as uuidv4 } from 'uuid';

import { useTranslation } from 'next-i18next';

import { Message } from '@/types/chat';
import { Prompt } from '@/types/prompt';

import HomeContext from '@/pages/api/home/home.context';

import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';

interface Props {
  onSend: (message: Message) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
}

export const ChatInput = ({
  onSend,
  onRegenerate,
  onScrollDownClick,
  stopConversationRef,
  textareaRef,
  showScrollDownButton,
}: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, messageIsStreaming, prompts },

    dispatch: homeDispatch,
  } = useContext(HomeContext);

  // upload progress state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleFileClick = () => fileInputRef.current?.click();
  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const promptListRef = useRef<HTMLUListElement | null>(null);
  // handle file upload + fake progress + API call
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    setProgress(0);
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 20, 90));
    }, 200);
    try {
      const form = new FormData();
      form.append('file', file);
      const id = uuidv4();
      const res = await fetch(`/api/process/${id}`, {
        method: 'POST',
        body: form,
      });
      clearInterval(timer);
      setProgress(100);
      if (res.ok) {
        setSuccess(true);
        setFileUrl(URL.createObjectURL(file));
      }
      else throw new Error(`Upload failed ${res.status}`);
    } catch (err) {
      clearInterval(timer);
      console.error(err);
      setProgress(0);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setProgress(0);
        //setSuccess(false);
      }, 2000);
    }
  };

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    setContent(value);
    updatePromptListVisibility(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content) {
      alert(t('Please enter a message'));
      return;
    }

    onSend({ role: 'user', content });
    setContent('');

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleStopConversation = () => {
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [content, textareaRef]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <>
      <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-6 dark:border-white/20 dark:via-[#343541] dark:to-[#343541] md:pt-2">
        <div className="stretch mx-2 mt-4 flex flex-row gap-3 last:mb-2 md:mx-4 md:mt-[52px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
          {messageIsStreaming && (
            <button
              className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-md border border-neutral-200 bg-white py-2 px-4 text-black hover:bg-neutral-100 transition-colors duration-200 shadow-sm dark:border-neutral-600 dark:bg-[#343541] dark:text-white dark:hover:bg-[#424554] md:mb-0 md:mt-2"
              onClick={handleStopConversation}
            >
              <IconPlayerStop size={16} stroke={2} /> {t('Stop Generating')}
            </button>
          )}

          {!messageIsStreaming &&
            selectedConversation &&
            selectedConversation.messages.length > 0 && (
              <button
                className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded-md border border-neutral-200 bg-white py-2 px-4 text-black hover:bg-neutral-100 transition-colors duration-200 shadow-sm dark:border-neutral-600 dark:bg-[#343541] dark:text-white dark:hover:bg-[#424554] md:mb-0 md:mt-2"
                onClick={onRegenerate}
              >
                <IconRepeat size={16} stroke={2} /> {t('Regenerate response')}
              </button>
            )}

 
          <div className="relative mx-2 flex w-full items-center space-x-2 rounded-xl border border-black/10 bg-white p-2 shadow-sm dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white sm:mx-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <button onClick={handleFileClick} className="p-1 text-gray-500 hover:text-gray-400">
              <IconFile size={20} />
            </button>
            {uploading && (
              <div className="relative w-6 h-6">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
              {/* Background circle */}
              <circle
                className="text-gray-300"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                className="text-blue-400"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                // For r=10, circumference = 2 * Math.PI * 10 ≈ 62.83
                strokeDasharray="62.83"
                strokeDashoffset={62.83 - (progress / 100) * 62.83}
                style={{ transition: 'stroke-dashoffset 0.2s linear' }}
              />
            </svg>
                {/*<span className="absolute inset-0 flex items-center justify-center text-xs">
                  {Math.round(progress)}%
                </span>*/}
              </div>
            )}
            {success && fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <img src="/docicon.png" alt="Uploaded File" className="w-6 h-6 rounded" />
                    <span className="text-xs text-black dark:text-white">{fileName}</span>
                    <IconCheck size={20} className="text-green-400" />
                </a>
            )}
            {success && !fileUrl && (
              <IconCheck size={20} className="text-green-400" />
            )}
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none border-0 bg-transparent p-0 py-2 pr-8 pl-10 text-black dark:bg-transparent dark:text-white"
              placeholder={t('Type a message…') || ''}
              value={content}
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSend} className="p-1 text-neutral-800 dark:text-neutral-100">
              {messageIsStreaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 dark:border-neutral-100"></div>
              ) : (
                <IconSend size={18} stroke={1.5} />
              )}
            </button>
          </div>
        </div>
        <div className="px-3 pt-2 pb-3 text-center text-[12px] text-black/50 dark:text-white/50 md:px-4 md:pt-3 md:pb-6">
          <a
            href="https://github.com/ivanfioravanti/chatbot-ollama"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-black/70 dark:hover:text-white/70 transition-colors duration-200"
          >
            dRAGon
          </a>
          .{' '}
          {t(
            "dRAGon is a free and open-source project. It's not affiliated with OpenAI, Microsoft, or any other company.",
          )}
        </div>
      </div>
    </>
  );
};
