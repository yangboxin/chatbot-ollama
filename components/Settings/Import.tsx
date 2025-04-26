import { IconFileImport } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { SupportedExportFormats } from '@/types/export';

import { SidebarButton } from '../Sidebar/SidebarButton';
import { on } from 'events';

interface Props {
  onUpload: (data: File) => void;
}

export const Import: FC<Props> = ({ onUpload }) => {
  const { t } = useTranslation('sidebar');
  return (
    <>
      <input
        id="import-file"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".doc,.docx,.pdf,.txt,.json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          onUpload(file);
        }}
      />

      <SidebarButton
        text={t('Upload Document')}
        icon={<IconFileImport size={18} />}
        onClick={() => {
          const importFile = document.querySelector(
            '#import-file',
          ) as HTMLInputElement;
          if (importFile) {
            importFile.click();
          }
        }}
      />
    </>
  );
};
