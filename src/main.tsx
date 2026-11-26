import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, matchPath } from 'react-router-dom';
import { App } from './app/App';
import { deliveryRoundPath, loadDeliveryRoundPage, type DeliveryRoundPageComponent } from './app/deliveryRoundRoute';
import { MockRoleProvider } from './auth/MockRoleProvider';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import './styles/global.css';

// 시스템 한글 글꼴을 먼저 사용할 수 있도록 웹 폰트 스타일시트는 별도로 불러온다.
void import('./styles/korean-font.css').catch(() => {
  // 웹 폰트를 받지 못하면 테마에 정의된 시스템 글꼴을 사용한다.
});

const root = createRoot(document.getElementById('root')!);

function renderApp(initialDeliveryRoundPage?: DeliveryRoundPageComponent, loadingInitialDeliveryRound = false) {
  root.render(
    <StrictMode>
      <ThemeModeProvider>
        <MockRoleProvider>
          <BrowserRouter>
            <App initialDeliveryRoundPage={initialDeliveryRoundPage} loadingInitialDeliveryRound={loadingInitialDeliveryRound} />
          </BrowserRouter>
        </MockRoleProvider>
      </ThemeModeProvider>
    </StrictMode>,
  );
}

if (matchPath(deliveryRoundPath, window.location.pathname)) {
  // 앱 틀을 먼저 표시하고 청크 로딩이 끝나면 통합현황을 바로 렌더링한다.
  renderApp(undefined, true);
  void loadDeliveryRoundPage().then(({ default: page }) => renderApp(page), () => renderApp());
} else {
  renderApp();
}
