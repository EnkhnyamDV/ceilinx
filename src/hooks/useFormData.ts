import { useState, useEffect } from 'react';
import { supabase, FormMeta, FormPosition } from '../lib/supabase';

export interface FormData {
  meta: FormMeta | null;
  positions: FormPosition[];
  loading: boolean;
  error: string | null;
}

export function useFormData(formId: string | null) {
  const [data, setData] = useState<FormData>({
    meta: null,
    positions: [],
    loading: true,
    error: null
  });

  const loadData = async () => {
    if (!formId) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Keine Formular-ID angegeben'
      }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Load form meta data
      const { data: metaData, error: metaError } = await supabase
        .from('form_meta')
        .select('*')
        .eq('id', formId)
        .single();

      if (metaError) {
        throw new Error('Formular nicht gefunden');
      }

      // Load positions - include ninox_nr, langtext, and kommentar fields
      const { data: positionsData, error: positionsError } = await supabase
        .from('form_positionen')
        .select('*')
        .eq('meta_id', formId)
        .order('oz');

      if (positionsError) {
        throw new Error('Fehler beim Laden der Positionen');
      }

      setData({
        meta: metaData,
        positions: positionsData || [],
        loading: false,
        error: null
      });
    } catch (error) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      }));
    }
  };

  const updatePositions = async (updatedPositions: FormPosition[]) => {
    try {
      // Update each position individually to avoid RLS issues
      // Update einzelpreis_netto and kommentar
      const updatePromises = updatedPositions.map(position => 
        supabase
          .from('form_positionen')
          .update({ 
            einzelpreis_netto: position.einzelpreis_netto,
            kommentar: position.kommentar
          })
          .eq('id', position.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Check if any updates failed
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Fehler beim Speichern der Preise');
      }

      // Update local state
      setData(prev => ({
        ...prev,
        positions: updatedPositions
      }));

      return true;
    } catch (error) {
      console.error('Error updating positions:', error);
      return false;
    }
  };

  const updateFormStatus = async (status: string) => {
    if (!data.meta) return false;

    try {
      const { error } = await supabase
        .from('form_meta')
        .update({ status })
        .eq('id', data.meta.id);

      if (error) {
        throw new Error('Fehler beim Aktualisieren des Status');
      }

      setData(prev => ({
        ...prev,
        meta: prev.meta ? { ...prev.meta, status } : null
      }));

      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    }
  };

  const updateGeneralComment = async (allgemeinerKommentar: string) => {
    if (!data.meta) return false;

    try {
      const { error } = await supabase
        .from('form_meta')
        .update({ allgemeiner_kommentar: allgemeinerKommentar })
        .eq('id', data.meta.id);

      if (error) {
        throw new Error('Fehler beim Speichern des allgemeinen Kommentars');
      }

      setData(prev => ({
        ...prev,
        meta: prev.meta ? { ...prev.meta, allgemeiner_kommentar: allgemeinerKommentar } : null
      }));

      return true;
    } catch (error) {
      console.error('Error updating general comment:', error);
      return false;
    }
  };

  useEffect(() => {
    loadData();
  }, [formId]);

  return {
    ...data,
    refetch: loadData,
    updatePositions,
    updateFormStatus,
    updateGeneralComment
  };
}