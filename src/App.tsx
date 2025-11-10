import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, Building2, AlertCircle, Loader2, Phone, User, Building, Mail, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useFormData } from './hooks/useFormData';
import { getFormIdFromUrl, formatGermanNumber, parseGermanNumber } from './utils/urlParams';
import { FormPosition } from './lib/supabase';
import { CollapsibleText } from './components/CollapsibleText';
import { calculatePricing, PricingData, PricingResults } from './utils/pricingCalculations';

function App() {
  const formId = getFormIdFromUrl();
  const { meta, positions, loading, error, refetch, updatePositions, updateFormStatus, updateGeneralComment, updatePricingFields, updateSupplierContact } = useFormData(formId);
  
  const [localPositions, setLocalPositions] = useState<FormPosition[]>([]);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [commentStates, setCommentStates] = useState<Record<string, boolean>>({});
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [globalLangtextVisible, setGlobalLangtextVisible] = useState(false);
  const [generalComment, setGeneralComment] = useState('');

  // Supplier contact person state
  const [lieferantVorname, setLieferantVorname] = useState('');
  const [lieferantNachname, setLieferantNachname] = useState('');

  // Pricing state
  const [nachlass, setNachlass] = useState<number>(0);
  const [nachlassType, setNachlassType] = useState<'percentage' | 'fixed'>('percentage');
  const [nachlassBetrag, setNachlassBetrag] = useState<number>(0); // EUR amount
  const [nachlassProzent, setNachlassProzent] = useState<number>(0); // percentage
  const [mwstRate, setMwstRate] = useState<number>(19); // Default 19% VAT
  const [skontoRate, setSkontoRate] = useState<number>(0);
  const [skontoDays, setSkontoDays] = useState<number>(0);
  const [pricingResults, setPricingResults] = useState<PricingResults | null>(null);

  // Raw input values for pricing (to avoid formatting issues while typing)
  const [nachlassInput, setNachlassInput] = useState<string>('');
  const [mwstInput, setMwstInput] = useState<string>('19');
  const [skontoInput, setSkontoInput] = useState<string>('');

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
    // Initialize supplier contact person fields
    if (meta) {
      setLieferantVorname(meta.lieferant_vorname || '');
      setLieferantNachname(meta.lieferant_nachname || '');
    }
    // Initialize pricing fields from meta
    if (meta) {
      const nachlassVal = meta.nachlass || 0;
      const mwstVal = meta.mwst_rate || 19;
      const skontoVal = meta.skonto_rate || 0;
      
      setNachlass(nachlassVal);
      setNachlassType(meta.nachlass_type || 'percentage');
      setMwstRate(mwstVal);
      setSkontoRate(skontoVal);
      setSkontoDays(meta.skonto_days || 0);
      
      // Initialize input strings
      setNachlassInput(nachlassVal > 0 ? nachlassVal.toString() : '');
      setMwstInput(mwstVal > 0 ? mwstVal.toString() : '19');
      setSkontoInput(skontoVal > 0 ? skontoVal.toString() : '');
    }
  }, [meta]);

  // Calculate pricing results whenever inputs change
  React.useEffect(() => {
    const netTotal = getTotalValueTimesQuantity();
    if (netTotal > 0) {
      const results = calculatePricing({
        netTotal,
        nachlass,
        nachlassType,
        mwstRate,
        skontoRate,
        skontoDays,
      });
      setPricingResults(results);
    } else {
      setPricingResults(null);
    }
  }, [localPositions, nachlass, nachlassType, mwstRate, skontoRate, skontoDays]);

  const isFormSubmitted = meta?.status === 'abgegeben';

  // Helper function to calculate total price for a position
  const calculateGesamtpreis = (position: FormPosition): number => {
    return (position.menge || 0) * (position.einzelpreis_netto || 0);
  };

  const triggerN8NWebhook = async (metaId: string) => {
    try {
      setIsProcessingDocument(true);
      
      const response = await fetch('https://n8n.digital-vereinfacht.de/webhook/sync-ninox-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uuid: metaId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Webhook response:', data);
        
        // Handle both array and single object responses
        let fileInfo = null;
        if (Array.isArray(data) && data.length > 0) {
          fileInfo = data[0];
        } else if (data && (data.fileData || data.url)) {
          fileInfo = data;
        }
        
        if (fileInfo) {
          console.log('Processing file:', fileInfo.fileName);
          
          // Check if we have base64 data or URL
          if (fileInfo.fileData) {
            console.log('Downloading from base64 data');
            await downloadFileFromBase64(fileInfo.fileData, fileInfo.fileName || 'document.pdf');
          } else if (fileInfo.url) {
            console.log('Downloading from URL:', fileInfo.url);
            await downloadFile(fileInfo.url, fileInfo.fileName || 'document.pdf');
          } else {
            console.warn('No file data or URL found in response');
          }
        } else {
          console.warn('No file info found in webhook response');
        }
      }
      
      console.log('Webhook to N8N triggered');
    } catch (error) {
      console.error('Failed to trigger N8N webhook:', error);
    } finally {
      setIsProcessingDocument(false);
    }
  };

  const downloadFileFromBase64 = async (base64Data: string, fileName: string) => {
    try {
      console.log('Converting base64 to file:', fileName);
      
      // Remove data URL prefix if present (e.g., "data:application/pdf;base64,")
      const base64String = base64Data.includes(',') 
        ? base64Data.split(',')[1] 
        : base64Data;
      
      // Convert base64 to binary
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create blob with proper PDF MIME type
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      console.log('Base64 blob created, size:', blob.size, 'type:', blob.type);
      
      // Try modern File System Access API first
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName.replace('.docx', '.pdf'),
            types: [{
              description: 'PDF files',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log('File saved via File System Access API');
          return;
        } catch (fsError) {
          console.log('File System Access API failed or cancelled:', fsError);
          // Fall through to traditional download
        }
      }
      
      // Traditional blob download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.docx', '.pdf');
      link.rel = 'noopener noreferrer';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('Base64 file download triggered successfully');
      
    } catch (error) {
      console.error('Failed to download file from base64:', error);
      
      // Fallback: show error message
      alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadFile = async (url: string, fileName: string) => {
    try {
      console.log('Starting download from URL:', url);
      
      // First try: Use fetch with proper headers to avoid CORS/security issues
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf,application/octet-stream,*/*',
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      console.log('Fetch response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      
      // Get the file as a blob with explicit PDF type
      const blob = await response.blob();
      
      // Ensure the blob has the correct MIME type
      const pdfBlob = blob.type === 'application/pdf' 
        ? blob 
        : new Blob([blob], { type: 'application/pdf' });
      
      console.log('Blob created, size:', pdfBlob.size, 'type:', pdfBlob.type);
      
      // Method 1: Try using the File System Access API (if available)
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: fileName.replace('.docx', '.pdf'),
            types: [{
              description: 'PDF files',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          
          console.log(`File "${fileName}" saved successfully using File System Access API`);
          return;
        } catch (fsError) {
          console.log('File System Access API failed, falling back to blob download');
        }
      }
      
      // Method 2: Traditional blob download with improved approach
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      
      // Create a more secure download approach
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName.replace('.docx', '.pdf'); // Ensure .pdf extension
      link.style.display = 'none';
      link.rel = 'noopener noreferrer'; // Security improvement
      
      // Trigger download in a user gesture context
      document.body.appendChild(link);
      
      // Use a timeout to ensure the click happens in the right context
      setTimeout(() => {
        link.click();
        
        // Cleanup after a longer delay to ensure download starts
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          window.URL.revokeObjectURL(blobUrl);
          console.log(`File "${fileName}" download triggered and cleaned up`);
        }, 1000);
      }, 10);
      
    } catch (error) {
      console.error('Failed to download file:', error);
      
      // Enhanced fallback: Create a proper download link
      try {
        console.log('Fallback: Creating download link');
        const fallbackLink = document.createElement('a');
        fallbackLink.href = url;
        fallbackLink.download = fileName.replace('.docx', '.pdf');
        fallbackLink.target = '_blank';
        fallbackLink.rel = 'noopener noreferrer';
        fallbackLink.style.display = 'none';
        
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        
        setTimeout(() => {
          if (document.body.contains(fallbackLink)) {
            document.body.removeChild(fallbackLink);
          }
        }, 1000);
        
      } catch (fallbackError) {
        console.error('All download methods failed:', fallbackError);
        
        // Last resort: Simple window.open
        window.open(url, '_blank');
      }
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
    
    // Update supplier contact information
    const contactSuccess = await updateSupplierContact({
      lieferant_vorname: lieferantVorname,
      lieferant_nachname: lieferantNachname
    });
    
    // Update pricing fields
    const pricingSuccess = await updatePricingFields({
      nachlass,
      nachlass_betrag: nachlassBetrag,
      nachlass_prozent: nachlassProzent,
      nachlass_type: nachlassType,
      mwst_rate: mwstRate,
      mwst_rate_no_discount: pricingResults?.mwstAmountNoDiscount || 0,
      skonto_rate: skontoRate,
      skonto_days: skontoDays
    });
    
    if (positionsSuccess && commentSuccess && contactSuccess && pricingSuccess) {
      // Update status to "abgegeben"
      const statusUpdateSuccess = await updateFormStatus('abgegeben');
      
      if (statusUpdateSuccess) {
        // Trigger N8N webhook asynchronously after successful submission
        triggerN8NWebhook(meta.id);
        
        setShowSuccess(true);
        
        // Smooth scroll to top after successful submission
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        
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

  const getTotalValueTimesQuantity = () => {
    return localPositions.reduce((sum, pos) => {
      return sum + calculateGesamtpreis(pos);
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
                    <span className="font-medium text-white">Ceilinx GmbH</span>
                  </div>
                </div>

                {/* Contact Person */}
                {meta.vAnsprechperson && (
                  <div className="flex items-center lg:justify-end space-x-2 text-sm">
                    <User className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                    <span className="text-blue-200 text-xs">Ansprechpartner:</span>
                    <span className="font-medium text-white">{meta.vAnsprechperson}</span>
                  </div>
                )}

                {/* Phone Number */}
                {meta.vAnsprechpersonTelefonNummer && (
                  <div className="flex items-center lg:justify-end space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                    <span className="text-blue-200 text-xs">Telefon:</span>
                    <span className="font-medium text-white">{meta.vAnsprechpersonTelefonNummer}</span>
                  </div>
                )}

                {/* Email Address */}
                {meta.vAnsprechpersonEmail && (
                  <div className="flex items-center lg:justify-end space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-[#beff2e] flex-shrink-0" />
                    <span className="text-blue-200 text-xs">E-Mail:</span>
                    <span className="font-medium text-white">{meta.vAnsprechpersonEmail}</span>
                  </div>
                )}
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
            <p className="text-green-600 text-xs md:text-sm mb-2">
              Das Formular ist nun gesperrt und kann nicht mehr bearbeitet werden.
            </p>
            <div className="flex items-center space-x-2">
              {isProcessingDocument ? (
                <>
                  <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                  <p className="text-green-600 text-xs md:text-sm">
                    📄 Dokument wird generiert...
                  </p>
                </>
              ) : (
                <p className="text-green-600 text-xs md:text-sm">
                  📄 Ihr Angebotsdokument wird automatisch heruntergeladen.
                </p>
              )}
            </div>
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
                  
                  {/* Quantity */}
                  {position.menge && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-200">
                        Menge: {formatGermanNumber(position.menge)}
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

                  {/* Total Price Display */}
                  {calculateGesamtpreis(position) > 0 && (
                    <div className="bg-blue-50/80 rounded-lg p-3 mb-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-700">Gesamtbetrag Netto (€):</span>
                        <div className="px-3 py-1 bg-blue-100 rounded-lg text-right font-mono text-sm text-blue-800 border border-blue-200 font-semibold">
                          {formatGermanNumber(calculateGesamtpreis(position))}
                        </div>
                      </div>
                    </div>
                  )}

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
                    <th className="text-center py-3 px-2 font-semibold text-[#020028] w-24">Menge</th>
                    <th className="text-center py-3 px-2 font-semibold text-[#020028] w-24">Einheit</th>
                    <th className="text-right py-3 px-2 font-semibold text-[#020028] w-40 whitespace-nowrap">
                      Einzelpreis netto (€)
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-[#020028] w-40 whitespace-nowrap">
                      Gesamtbetrag Netto (€)
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
                        {position.menge && (
                          <span className="font-mono text-sm text-gray-700">
                            {formatGermanNumber(position.menge)}
                          </span>
                        )}
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
                      <td className="py-4 px-2 w-40">
                        <div className="flex justify-end">
                          <div className="w-28 px-3 py-2 bg-gray-50 rounded-lg text-right font-mono text-sm text-gray-700 border border-gray-200 shadow-sm">
                            {formatGermanNumber(calculateGesamtpreis(position))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {hasValidPrices && (
              <>
                {/* Pricing Details Section */}
                <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="space-y-4">
                    {/* Gesamtbetrag Netto (Top Display) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Gesamtbetrag netto</span>
                        <span className="text-xl font-bold text-[#020028] font-mono">
                          {formatGermanNumber(getTotalValueTimesQuantity())} €
                        </span>
                      </div>
                    </div>

                    {/* Nachlass Section */}
                    <div className="flex items-center py-2">
                      <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">Nachlass</label>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <input
                          type="text"
                          value={nachlassInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setNachlassInput(value);
                          }}
                          onBlur={(e) => {
                            const value = parseGermanNumber(e.target.value);
                            setNachlass(value);
                            
                            // Calculate both percentage and fixed amount
                            const netTotal = getTotalValueTimesQuantity();
                            if (netTotal > 0 && value > 0) {
                              if (nachlassType === 'percentage') {
                                // User entered percentage, calculate fixed amount
                                const betrag = netTotal * (value / 100);
                                setNachlassProzent(value);
                                setNachlassBetrag(betrag);
                              } else {
                                // User entered fixed amount, calculate percentage
                                const prozent = (value / netTotal) * 100;
                                setNachlassBetrag(value);
                                setNachlassProzent(prozent);
                              }
                            }
                            
                            // Format on blur
                            if (value > 0) {
                              setNachlassInput(formatGermanNumber(value));
                            }
                          }}
                          disabled={isFormSubmitted}
                          placeholder="0,00"
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg 
                                   focus:border-[#203AEA] focus:ring-1 focus:ring-[#203AEA]/20 
                                   focus:outline-none text-right font-mono text-sm bg-white
                                   transition-all duration-200
                                   disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex bg-gray-50 rounded-lg border border-gray-300">
                          <button
                            type="button"
                            onClick={() => {
                              setNachlassType('percentage');
                              if (nachlassProzent > 0) {
                                setNachlass(nachlassProzent);
                                setNachlassInput(formatGermanNumber(nachlassProzent));
                              }
                            }}
                            disabled={isFormSubmitted}
                            className={`px-3 py-1.5 text-sm font-medium transition-all ${
                              nachlassType === 'percentage'
                                ? 'bg-[#4F6BFF] text-white rounded-lg'
                                : 'text-gray-600 hover:text-gray-900'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNachlassType('fixed');
                              if (nachlassBetrag > 0) {
                                setNachlass(nachlassBetrag);
                                setNachlassInput(formatGermanNumber(nachlassBetrag));
                              }
                            }}
                            disabled={isFormSubmitted}
                            className={`px-3 py-1.5 text-sm font-medium transition-all ${
                              nachlassType === 'fixed'
                                ? 'bg-[#4F6BFF] text-white rounded-lg'
                                : 'text-gray-600 hover:text-gray-900'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            EUR
                          </button>
                        </div>
                        <span className="text-sm font-mono text-gray-700 min-w-[100px] text-right">
                          {pricingResults ? formatGermanNumber(pricingResults.nachlassAmount) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    {/* Gesetzl. Mehrwertsteuer Section */}
                    <div className="flex items-center py-2">
                      <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">Gesetzl. Mehrwertsteuer</label>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <input
                          type="text"
                          value={mwstInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setMwstInput(value);
                          }}
                          onBlur={(e) => {
                            const value = parseGermanNumber(e.target.value);
                            setMwstRate(value);
                            if (value > 0) {
                              setMwstInput(formatGermanNumber(value));
                            }
                          }}
                          disabled={isFormSubmitted}
                          placeholder="19,00"
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg 
                                   focus:border-[#203AEA] focus:ring-1 focus:ring-[#203AEA]/20 
                                   focus:outline-none text-right font-mono text-sm bg-white
                                   transition-all duration-200
                                   disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm font-medium text-gray-600 w-[72px]">%</span>
                        <span className="text-sm font-mono text-gray-700 min-w-[100px] text-right">
                          {pricingResults ? formatGermanNumber(pricingResults.mwstAmount) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    {/* Ausgewiesene Mehrwertsteuer - Read-only Display */}
                    <div className="flex items-center py-2">
                      <span className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">Ausgewiesene Mehrwertsteuer</span>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className="text-sm font-medium text-gray-600 w-24 text-right">{formatGermanNumber(mwstRate)} %</span>
                        <span className="text-sm font-medium text-gray-600 w-[72px]"></span>
                        <span className="text-sm font-mono text-gray-700 min-w-[100px] text-right">
                          {pricingResults ? formatGermanNumber(pricingResults.mwstAmountNoDiscount) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    {/* Gesamtbetrag Brutto */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Gesamtbetrag brutto</span>
                        <span className="text-xl font-bold text-[#020028] font-mono">
                          {pricingResults ? formatGermanNumber(pricingResults.grossTotal) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    {/* Skonto Section */}
                    <div className="flex items-center py-2">
                      <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">Skonto</label>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <input
                          type="text"
                          value={skontoInput}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.,]/g, '');
                            setSkontoInput(value);
                          }}
                          onBlur={(e) => {
                            const value = parseGermanNumber(e.target.value);
                            setSkontoRate(value);
                            if (value > 0) {
                              setSkontoInput(formatGermanNumber(value));
                            }
                          }}
                          disabled={isFormSubmitted}
                          placeholder="0,00"
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg 
                                   focus:border-[#203AEA] focus:ring-1 focus:ring-[#203AEA]/20 
                                   focus:outline-none text-right font-mono text-sm bg-white
                                   transition-all duration-200
                                   disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm font-medium text-gray-600 w-[72px]">%</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={skontoDays || ''}
                            onChange={(e) => setSkontoDays(parseInt(e.target.value) || 0)}
                            disabled={isFormSubmitted}
                            placeholder="0"
                            min="0"
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg 
                                     focus:border-[#203AEA] focus:ring-1 focus:ring-[#203AEA]/20 
                                     focus:outline-none text-right font-mono text-sm bg-white
                                     transition-all duration-200
                                     disabled:bg-gray-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-600">Tage</span>
                        </div>
                        <span className="text-sm font-mono text-gray-700 min-w-[100px] text-right">
                          {pricingResults ? formatGermanNumber(pricingResults.skontoAmount) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    {/* Gesamtbetrag Brutto (skontiert) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Gesamtbetrag brutto (skontiert)</span>
                        <span className="text-xl font-bold text-[#020028] font-mono">
                          {pricingResults ? formatGermanNumber(pricingResults.finalGrossTotal) : '0,00'} €
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Gesamtbetrag netto inkl. Nachlass</span>
                        <span className="text-xl font-bold text-[#020028] font-mono">
                          {pricingResults ? formatGermanNumber(pricingResults.finalNetTotal) : '0,00'} €
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            )}

            {/* General Comment Section */}
            <div className="mt-6 space-y-4">
              {/* Supplier Contact Person Section */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <h3 className="text-base font-bold text-[#020028] mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2 text-[#203AEA]" />
                  Kontaktperson des Lieferanten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vorname (First Name) */}
                  <div>
                    <label htmlFor="lieferant-vorname" className="block text-sm font-medium text-gray-700 mb-2">
                      Vorname
                    </label>
                    {isFormSubmitted ? (
                      <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 shadow-sm">
                        {meta.lieferant_vorname || '-'}
                      </div>
                    ) : (
                      <input
                        id="lieferant-vorname"
                        type="text"
                        value={lieferantVorname}
                        onChange={(e) => setLieferantVorname(e.target.value)}
                        placeholder="Max"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg 
                                 focus:border-[#203AEA] focus:outline-none text-sm
                                 transition-all duration-200 hover:border-gray-300
                                 bg-white shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                      />
                    )}
                  </div>

                  {/* Nachname (Last Name) */}
                  <div>
                    <label htmlFor="lieferant-nachname" className="block text-sm font-medium text-gray-700 mb-2">
                      Nachname
                    </label>
                    {isFormSubmitted ? (
                      <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 shadow-sm">
                        {meta.lieferant_nachname || '-'}
                      </div>
                    ) : (
                      <input
                        id="lieferant-nachname"
                        type="text"
                        value={lieferantNachname}
                        onChange={(e) => setLieferantNachname(e.target.value)}
                        placeholder="Mustermann"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg 
                                 focus:border-[#203AEA] focus:outline-none text-sm
                                 transition-all duration-200 hover:border-gray-300
                                 bg-white shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#203AEA]/10"
                      />
                    )}
                  </div>
                </div>
              </div>

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