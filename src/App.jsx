import { AppProvider } from './state/AppContext'
import { DragProvider, ModalProvider, ToastProvider } from './state/UIContext'
import Toolbar       from './components/Toolbar'
import LibraryPanel  from './components/LibraryPanel'
import RackCanvas    from './components/RackCanvas'
import PropertiesPanel from './components/PropertiesPanel'
import DeviceModal   from './components/DeviceModal'
import ConfirmModal  from './components/ConfirmModal'

export default function App() {
  return (
    <AppProvider>
      <DragProvider>
        <ModalProvider>
          <ToastProvider>
            <div className="app-shell">
              <Toolbar />
              <div className="app-body">
                <LibraryPanel />
                <RackCanvas />
                <PropertiesPanel />
              </div>
            </div>
            <DeviceModal />
            <ConfirmModal />
          </ToastProvider>
        </ModalProvider>
      </DragProvider>
      <footer className="app-footer">
        <span>Built with love ❤️ by Lucacri</span>
      </footer>
    </AppProvider>
  )
}
