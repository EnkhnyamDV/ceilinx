import React, { useState } from 'react';
import { Send, CheckCircle2, Building2, AlertCircle, Loader2, Phone, User, FileText, Building, Mail, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useFormData } from './hooks/useFormData';
import { getFormIdFromUrl, formatGermanNumber, parseGermanNumber } from './utils/urlParams';
import { FormPosition } from './lib/supabase';
import { CollapsibleText } from './components/CollapsibleText';

function App() {
  const formId = getFormIdFromUrl();
  const { meta, positions, loading, error, refetch, updatePositions, updateFormStatus, updateGeneralComment } = useFormData(formId);
  
  const [localPositions, setLocalPositions] = useState<FormPosition[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [commentStates, setCommentStates] = useState<Record<string, boolean>>({});
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [globalLangtextVisible, setGlobalLangtextVisible] = useState(false);
  const [generalComment, setGeneralComment] = useState('');

  // Company information - these would typically come from props or context
  const companyInfo = {
    senderCompany: "Ceilinx GmbH",
    offerNumber: "AG-2024-0152",
    contactPerson: "Max Mustermann",
    contactPhone: "+49 2405 1234567",
    contactEmail: "max.mustermann@ceilinx.de"
  };

  // Update local positions when data loads
  React.useEffect(() => {
    if (positions.length > 0) {
      setLocalPositions(positions);
      // Initialize input values with formatted prices
      const initialInputValues: Record<string, string> = {};
      const initialCommentValues: Record<string, string> = {};
      const initialCommentStates: Record<string, boolean> = {};
      
      positions.forEach(pos => {
        if (pos.einzelpreis_netto && pos.einzelpreis_netto > 0) {
          initialInputValues[pos.id] = formatGermanNumber(pos.einzelpreis_netto);
        }
        if (pos.kommentar) {
          initialCommentValues[pos.id] = pos.kommentar;
          initialCommentStates[pos.id] = true;
        }
      });
      
      setInputValues(initialInputValues);
      setCommentValues(initialCommentValues);
      setCommentStates(initialCommentStates);
    }
  }, [positions]);

  // Update general comment when meta data loads
  React.useEffect(() => {
    if (meta?.allgemeiner_kommentar) {
      setGeneralComment(meta.allgemeiner_kommentar);
    }
  }, [meta]);

  const isFormSubmitted = meta?.status === 'abgegeben';

  const triggerN8NWebhook = async (metaId: string) => {
    try {
      await fetch('https://n8n.digital-vereinfacht.de/webhook/sync-ninox-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: metaId
        })
      });
      console.log('Webhook to N8N triggered');
    } catch (error) {
      console.error('Failed to trigger N8N webhook:', error);
    }
  };

  const handlePriceChange = (id: string, value: string) => {
    // Don't allow changes if form is already submitted
    if (isFormSubmitted) return;
    
    // Allow only numbers, comma and dots, but keep as string
    const cleanValue = value.replace(/[^0-9.,]/g, '');
    
    // Update the input display value immediately
    setInputValues(prev => ({
      ...prev,
      [id]: cleanValue
    }));
    
    // Update the numeric value in positions for calculations
    // Only parse if we have a valid value, otherwise set to 0
    const numericValue = cleanValue ? parseGermanNumber(cleanValue) : 0;
    setLocalPositions(prev =>
      prev.map(pos =>
        pos.id === id 
          ? { ...pos, einzelpreis_netto: numericValue }
          : pos
      )
    );
  };

  const handleCommentToggle = (id: string) => {
    if (isFormSubmitted) return;
    
    setCommentStates(prev => {
      const newState = !prev[id];
      
      // If disabling comment, clear the comment value
      if (!newState) {
        setCommentValues(prevValues => ({
          ...prevValues,
          [id]: ''
        }));
        
        // Update position data
        setLocalPositions(prevPositions =>
          prevPositions.map(pos =>
            pos.id === id ? { ...pos, kommentar: null } : pos
          )
        );
      }
      
      return {
        ...prev,
        [id]: newState
      };
    });
  };

  const handleCommentChange = (id: string, value: string) => {
    if (isFormSubmitted) return;
    
    setCommentValues(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Update position data
    setLocalPositions(prev =>
      prev.map(pos =>
        pos.id === id ? { ...pos, kommentar: value || null } : pos
      )
    );
  };

  const handleGeneralCommentChange = (value: string) => {
    if (isFormSubmitted) return;
    setGeneralComment(value);
  };

  const hasEmptyPrices = () => {
    return localPositions.some(pos => !inputValues[pos.id] || inputValues[pos.id].trim() === '');
  };

  const handleSubmitClick = () => {
    if (isFormSubmitted || !meta) return;
    
    // Check if there are empty prices and show confirmation dialog
    if (hasEmptyPrices()) {
      setShowConfirmDialog(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (isFormSubmitted || !meta) return;
    
    setIsSubmitting(true);
    setShowConfirmDialog(false);
    
    // Update positions
    const positionsSuccess = await updatePositions(localPositions);
    
    // Update general comment
    const commentSuccess = await updateGeneralComment(generalComment);
    
    if (positionsSuccess && commentSuccess) {
      // Update status to "abgegeben"
      const statusUpdateSuccess = await updateFormStatus('abgegeben');
      
      if (statusUpdateSuccess) {
        // Trigger N8N webhook asynchronously after successful submission
        triggerN8NWebhook(meta.id);
        
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 6000);
      }
    }
    
    setIsSubmitting(false);
  };

  const getTotalValue = () => {
    return localPositions.reduce((sum, pos) => {
      return sum + (pos.einzelpreis_netto || 0);
    }, 0);
  };

  const hasValidPrices = localPositions.some(pos => (pos.einzelpreis_netto || 0) > 0);

  const hasLangtextPositions = localPositions.some(pos => pos.langtext && pos.langtext.trim() !== '');

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EAEFF7] to-[#f8fafc] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#203AEA] animate-spin mx-auto mb-4" />
          <p className="text-[#020028] font-medium">Formular wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !meta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EAEFF7] to-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-2xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-[#020028] mb-2">Formular nicht gefunden</h1>
          <p className="text-gray-600 mb-4 text-sm md:text-base">
            {error || 'Das angeforderte Formular konnte nicht geladen werden.'}
          </p>
          <p className="text-xs md:text-sm text-gray-500">
            Bitte überprüfen Sie den Link oder wenden Sie sich an den Absender.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAEFF7] to-[#f8fafc]">
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <h3 className="text-lg font-bold text-[#020028]">Bestätigung erforderlich</h3>
            </div>
            <p className="text-gray-700 mb-6 text-sm leading-relaxed">
              Einige Preise wurden nicht ausgefüllt. Sind Sie sicher, dass Sie das Formular ohne Vervollständigung aller Einträge abschicken möchten?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#020028] 
                         font-medium rounded-lg transition-all duration-200 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-[#203AEA] hover:bg-[#1a2fd4] text-white 
                         font-medium rounded-lg transition-all duration-200 text-sm"
              >
                Trotzdem abschicken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#020028] text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
            {/* Left side - Main title and info */}
            <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
              <div className="p-2 md:p-3 bg-[#203AEA] rounded-xl flex-shrink-0">
                <Building2 className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-3xl font-bold tracking-tight truncate">{meta.lieferantenname}</h1>
                <p className="text-blue-200 mt-1 text-sm md:text-base">
                  Angebotsformular • {meta.kalkulation_id || 'Preisabfrage'}
                </p>
                {meta.status && (
                  <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs font-medium mt-2 ${
                    meta.status === 'abgegeben' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-yellow-500 text-black'
                  }`}>
                    Status: {meta.status === 'abgegeben' ? 'Abgegeben' : 'Entwurf'}
                  </span>
                )}
              </div>
            </div>

            {/* Right side - Company information */}
            <div className="lg:ml-8 lg:text-right space-y-2 lg:min-w-0 lg:flex-shrink-0">
              <div className="space-y-1.5">
                {/* Sender Company with Logo */}
                <div className="flex items-center lg:justify-end space-x-2 text-sm">
                  <Building className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                  <span className="text-blue-200 text-xs">Erstellt von:</span>
                  <div className="flex items-center space-x-2">
                    <img 
                      src="https://ceilinx.ninoxdb.de/share/ru3l2lce43w4k83tvhxk74ols6xgp02xlq9o" 
                      alt="Ceilinx Logo"
                      className="h-6 w-auto object-contain"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <span className="font-medium text-white">{companyInfo.senderCompany}</span>
                  </div>
                </div>

                {/* Offer Number */}
                <div className="flex items-center lg:justify-end space-x-2 text-sm">
                  <FileText className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                  <span className="text-blue-200 text-xs">Angebotsnummer:</span>
                  <span className="font-medium text-white">{companyInfo.offerNumber}</span>
                </div>

                {/* Contact Person */}
                <div className="flex items-center lg:justify-end space-x-2 text-sm">
                  <User className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                  <span className="text-blue-200 text-xs">Ansprechpartner:</span>
                  <span className="font-medium text-white">{companyInfo.contactPerson}</span>
                </div>

                {/* Phone Number */}
                <div className="flex items-center lg:justify-end space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                  <span className="text-blue-200 text-xs">Telefon:</span>
                  <span className="font-medium text-white">{companyInfo.contactPhone}</span>
                </div>

                {/* Email Address */}
                <div className="flex items-center lg:justify-end space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                  <span className="text-blue-200 text-xs">E-Mail:</span>
                  <span className="font-medium text-white">{companyInfo.contactEmail}</span>
                </div>
              </div>

              {/* Accent line */}
              <div className="hidden lg:block w-full h-px bg-gradient-to-r from-transparent to-[#beff2e] mt-3"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Success Message */}
        {(showSuccess || isFormSubmitted) && (
          <div className="mb-4 md:mb-6 p-4 md:p-6 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600 flex-shrink-0" />
              <h3 className="text-base md:text-lg font-bold text-green-800">Vielen Dank!</h3>
            </div>
            <p className="text-green-700 font-medium text-sm md:text-base mb-3">
              Ihre Preise wurden erfolgreich übermittelt und gespeichert.
            </p>
            <p className="text-green-600 text-xs md:text-sm">
              Das Formular ist nun gesperrt und kann nicht mehr bearbeitet werden.
            </p>
          </div>
        )}

        {/* Quote Form Card */}
        <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${
          isFormSubmitted ? 'opacity-75' : ''
        }`}>
          <div className={`bg-gradient-to-r p-4 ${
            isFormSubmitted 
              ? 'from-green-500 to-green-600' 
              : 'from-[#203AEA] to-[#4f46e5]'
          }`}>
            <h2 className="text-lg md:text-xl font-bold text-white">
              {isFormSubmitted ? 'Abgegebenes Angebot' : 'Positionen & Preise'}
            </h2>
            <p className="text-blue-100 mt-1 text-sm md:text-base">
              {isFormSubmitted 
                ? 'Dieses Angebot wurde bereits abgegeben' 
                : 'Bitte geben Sie Ihre Einzelpreise netto ein'
              }
            </p>
          </div>

          <div className="p-3 md:p-4">
            {/* Global Langtext Control */}
            {hasLangtextPositions && !isFormSubmitted && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <button
                  onClick={() => setGlobalLangtextVisible(!globalLangtextVisible)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 
                           text-[#020028] font-medium rounded-lg transition-all duration-200 text-sm"
                >
                  {globalLangtextVisible ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span>
                    {globalLangtextVisible ? 'Alle Langtexte ausblenden' : 'Alle Langtexte anzeigen'}
                  </span>
                </button>
              </div>
            )}

            {/* Mobile Card Layout */}
            <div className="block md:hidden space-y-4">
              {localPositions.map((position, index) => (
                <div 
                  key={position.id} 
                  className={`p-4 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                    index % 2 === 0 
                      ? 'bg-white border-gray-200' 
                      : 'bg-gray-50/50 border-gray-150'
                  } ${isFormSubmitted ? 'opacity-75' : 'hover:border-[#203AEA]/30'}`}
                >
                  {/* Position Header with OZ Badge */}
                  <div className="flex items-start justify-between mb-3">
                    {position.oz && (
                      <div className="inline-block px-3 py-1.5 bg-[#203AEA] text-white text-xs font-mono font-bold rounded-lg shadow-sm">
                        {position.oz}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 font-mono">
                      #{index + 1}
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="font-medium text-[#020028] text-sm leading-relaxed mb-3 border-l-4 border-[#203AEA]/20 pl-3">
                    {position.bezeichnung}
                  </div>
                  
                  {/* Langtext (Detailed Description) */}
                  {position.langtext && (
                    <div className="mb-3">
                      <CollapsibleText 
                        text={position.langtext} 
                        isGloballyVisible={globalLangtextVisible}
                      />
                    </div>
                  )}
                  
                  {/* Unit */}
                  {position.einheit && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                        Einheit: {position.einheit}
                      </span>
                    </div>
                  )}
                  
                  {/* Price Input Section */}
                  <div className="bg-gray-50/80 rounded-lg p-3 mb-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Einzelpreis netto (€):</span>
                      <div className="flex items-center space-x-2">
                        {isFormSubmitted ? (
                          <div className="px-3 py-2 bg-white rounded-lg text-right font-mono text-sm text-gray-700 border-2 border-gray-200 min-w-[80px] shadow-sm">
                            {position.einzelpreis_netto ? formatGermanNumber(position.einzelpreis_netto) : '0,00'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={inputValues[position.id] || ''}
                            onChange={(e) => handlePriceChange(position.id, e.target.value)}
                            className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg 
                                     focus:border-[#203AEA] focus:outline-none text-right font-mono text-sm
                                     transition-all duration-200 hover:border-gray-300 bg-white shadow-sm
                                     focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                            placeholder="0,00"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Section */}
                  {!isFormSubmitted && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          id={`comment-${position.id}`}
                          checked={commentStates[position.id] || false}
                          onChange={() => handleCommentToggle(position.id)}
                          className="w-4 h-4 text-[#203AEA] border-gray-300 rounded focus:ring-[#203AEA]"
                        />
                        <label 
                          htmlFor={`comment-${position.id}`}
                          className="text-sm text-gray-600 cursor-pointer flex items-center space-x-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>Kommentar hinzufügen</span>
                        </label>
                      </div>
                      
                      {commentStates[position.id] && (
                        <textarea
                          value={commentValues[position.id] || ''}
                          onChange={(e) => handleCommentChange(position.id, e.target.value)}
                          placeholder="Ihr Kommentar zu dieser Position..."
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg 
                                   focus:border-[#203AEA] focus:outline-none text-sm
                                   transition-all duration-200 hover:border-gray-300 resize-none
                                   bg-white shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                          rows={3}
                          autoFocus
                        />
                      )}
                    </div>
                  )}

                  {/* Display comment if form is submitted */}
                  {isFormSubmitted && position.kommentar && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center space-x-1 mb-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-600">Kommentar:</span>
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                        {position.kommentar}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-3 px-2 font-semibold text-[#020028] w-20">OZ</th>
                    <th className="text-left py-3 px-2 font-semibold text-[#020028]">Bezeichnung</th>
                    <th className="text-center py-3 px-2 font-semibold text-[#020028] w-24">Einheit</th>
                    <th className="text-right py-3 px-2 font-semibold text-[#020028] w-40 whitespace-nowrap">
                      Einzelpreis netto (€)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {localPositions.map((position, index) => (
                    <tr 
                      key={position.id} 
                      className={`border-b border-gray-100 transition-all duration-200 ${
                        index % 2 === 0 
                          ? 'bg-white hover:bg-blue-50/30' 
                          : 'bg-gray-50/40 hover:bg-blue-50/50'
                      } ${!isFormSubmitted ? 'hover:shadow-sm' : ''}`}
                    >
                      {/* Hidden ninox_nr field - not visible in UI but preserved in data */}
                      <td style={{ display: 'none' }}>
                        <input 
                          type="hidden" 
                          value={position.ninox_nr || ''} 
                          readOnly 
                        />
                      </td>
                      
                      <td className="py-4 px-2 w-20">
                        <div className="font-mono text-[#203AEA] font-semibold text-sm bg-[#203AEA]/10 px-2 py-1 rounded-md inline-block">
                          {position.oz}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="space-y-2">
                          <div className="font-medium text-[#020028] text-sm leading-relaxed border-l-4 border-[#203AEA]/20 pl-3">
                            {position.bezeichnung}
                          </div>
                          
                          {/* Langtext (Detailed Description) */}
                          {position.langtext && (
                            <CollapsibleText 
                              text={position.langtext} 
                              isGloballyVisible={globalLangtextVisible}
                            />
                          )}
                          
                          {/* Comment Section for Desktop */}
                          {!isFormSubmitted && (
                            <div className="pt-2 border-t border-gray-100/50">
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id={`comment-desktop-${position.id}`}
                                  checked={commentStates[position.id] || false}
                                  onChange={() => handleCommentToggle(position.id)}
                                  className="w-4 h-4 text-[#203AEA] border-gray-300 rounded focus:ring-[#203AEA]"
                                />
                                <label 
                                  htmlFor={`comment-desktop-${position.id}`}
                                  className="text-sm text-gray-600 cursor-pointer flex items-center space-x-1"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Kommentar hinzufügen</span>
                                </label>
                              </div>
                              
                              {commentStates[position.id] && (
                                <textarea
                                  value={commentValues[position.id] || ''}
                                  onChange={(e) => handleCommentChange(position.id, e.target.value)}
                                  placeholder="Ihr Kommentar zu dieser Position..."
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg 
                                           focus:border-[#203AEA] focus:outline-none text-sm
                                           transition-all duration-200 hover:border-gray-300 resize-none
                                           bg-white shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                                  rows={3}
                                  autoFocus
                                />
                              )}
                            </div>
                          )}

                          {/* Display comment if form is submitted */}
                          {isFormSubmitted && position.kommentar && (
                            <div className="pt-2 border-t border-gray-100/50">
                              <div className="flex items-center space-x-1 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-600">Kommentar:</span>
                              </div>
                              <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                                {position.kommentar}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-2 w-24 text-center">
                        {position.einheit && (
                          <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-200">
                            {position.einheit}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-2 w-40">
                        <div className="flex justify-end">
                          {isFormSubmitted ? (
                            <div className="w-28 px-3 py-2 bg-white rounded-lg text-right font-mono text-sm text-gray-700 border-2 border-gray-200 shadow-sm">
                              {position.einzelpreis_netto ? formatGermanNumber(position.einzelpreis_netto) : '0,00'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={inputValues[position.id] || ''}
                              onChange={(e) => handlePriceChange(position.id, e.target.value)}
                              className="w-28 px-3 py-2 border-2 border-gray-200 rounded-lg 
                                       focus:border-[#203AEA] focus:outline-none text-right font-mono text-sm
                                       transition-all duration-200 hover:border-gray-300 bg-white shadow-sm
                                       focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                              placeholder="0,00"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {hasValidPrices && (
              <div className={`mt-6 p-4 rounded-xl border-l-4 shadow-sm ${
                isFormSubmitted 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-[#EAEFF7] border-[#203AEA]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                  <span className="text-[#020028] font-semibold text-sm md:text-base">Summe aller Positionen:</span>
                  <span className={`text-xl md:text-2xl font-bold ${
                    isFormSubmitted ? 'text-green-600' : 'text-[#203AEA]'
                  }`}>
                    {formatGermanNumber(getTotalValue())} €
                  </span>
                </div>
              </div>
            )}

            {/* General Comment Section */}
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <label htmlFor="general-comment" className="block text-sm font-medium text-[#020028] mb-3">
                  Allgemeiner Kommentar (optional)
                </label>
                {isFormSubmitted ? (
                  meta.allgemeiner_kommentar ? (
                    <div className="px-4 py-3 bg-white rounded-lg border-2 border-gray-200 text-sm text-gray-700 leading-relaxed shadow-sm">
                      {meta.allgemeiner_kommentar}
                    </div>
                  ) : (
                    <div className="px-4 py-3 bg-white rounded-lg border-2 border-gray-200 text-sm text-gray-400 italic shadow-sm">
                      Kein allgemeiner Kommentar hinterlassen
                    </div>
                  )
                ) : (
                  <textarea
                    id="general-comment"
                    value={generalComment}
                    onChange={(e) => handleGeneralCommentChange(e.target.value)}
                    placeholder="Hier können Sie zusätzliche Hinweise oder Informationen hinterlassen …"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg 
                             focus:border-[#203AEA] focus:outline-none text-sm
                             transition-all duration-200 hover:border-gray-300 resize-none
                             bg-white shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10
                             leading-relaxed"
                    rows={4}
                  />
                )}
              </div>

              {/* Legal Notice and Action Button */}
              {!isFormSubmitted && (
                <>
                  {/* Legal Notice */}
                  <div className="text-center bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Mit dem Absenden bestätige ich die Richtigkeit der Preise und erkenne die Vergabebedingungen an.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleSubmitClick}
                      disabled={isSubmitting || !hasValidPrices}
                      className="px-8 py-3 bg-[#203AEA] hover:bg-[#1a2fd4] text-white font-semibold 
                               rounded-xl transition-all duration-200 flex items-center space-x-2 
                               disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 text-sm md:text-base
                               shadow-md hover:shadow-xl"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? 'Sende...' : 'Abschicken'}</span>
                    </button>
                  </div>
                </>
              )}

              {!hasValidPrices && !isFormSubmitted && (
                <p className="mt-3 text-xs md:text-sm text-gray-500 text-center">
                  Bitte geben Sie mindestens einen Preis ein, um das Angebot abzuschicken.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Angebotsformular • Version 2.0 • Formular-ID: {formId}</p>
        </div>
      </div>
    </div>
  );
}

export default App;