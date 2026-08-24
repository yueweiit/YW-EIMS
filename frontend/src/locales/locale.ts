import zhCN from './langs/zh-cn';
import enUS from './langs/en-us';
import esMX from './langs/es-mx';

const locales: Record<App.I18n.LangType, App.I18n.Schema> = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'es-MX': esMX
};

export default locales;
