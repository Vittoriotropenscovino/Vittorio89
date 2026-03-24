import { useState, useCallback } from 'react';
import { Trip } from '../types';

export type ModalType = 'none' | 'form' | 'settings' | 'privacy' | 'terms' | 'stats' | 'calendar' | 'itineraryManager' | 'helpGuide';

export function useModals() {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const openModal = useCallback((modal: ModalType) => {
    setActiveModal(modal);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal('none');
  }, []);

  const selectTrip = useCallback((trip: Trip | null) => {
    setSelectedTrip(trip);
  }, []);

  const startEditTrip = useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setActiveModal('form');
  }, []);

  const closeForm = useCallback(() => {
    setActiveModal('none');
    setEditingTrip(null);
  }, []);

  const showSaveToast = useCallback((message: string) => {
    setSaveMsg(message);
    setShowSaveConfirm(true);
  }, []);

  const hideSaveToast = useCallback(() => {
    setShowSaveConfirm(false);
  }, []);

  return {
    activeModal,
    selectedTrip,
    sidebarOpen,
    editingTrip,
    showSaveConfirm,
    saveMsg,
    openModal,
    closeModal,
    selectTrip,
    startEditTrip,
    closeForm,
    setSidebarOpen,
    showSaveToast,
    hideSaveToast,
  };
}
