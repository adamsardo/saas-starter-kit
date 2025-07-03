import React, { useState } from 'react';
import { ClinicalFlag, FlagType } from '@/types/clinical-flags';
import { Button, Modal } from 'react-daisyui';
import { Card } from '@/components/shared';

interface ClinicalFlagAlertProps {
  flag: ClinicalFlag;
  onAcknowledge?: (flagId: string, notes?: string) => void;
  showActions?: boolean;
}

export const ClinicalFlagAlert: React.FC<ClinicalFlagAlertProps> = ({ 
  flag, 
  onAcknowledge,
  showActions = true 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900 text-red-100 animate-pulse';
      case 'high': return 'bg-red-700 text-red-50';
      case 'medium': return 'bg-yellow-700 text-yellow-50';
      case 'low': return 'bg-blue-700 text-blue-50';
      default: return 'bg-gray-700 text-gray-50';
    }
  };

  const getIcon = (type: FlagType) => {
    switch (type) {
      case 'suicide_risk': return '🚨';
      case 'self_harm': return '⚠️';
      case 'medication_noncompliance': return '💊';
      case 'psychosis_indicators': return '🧠';
      case 'trauma_disclosure': return '😢';
      case 'homicidal_ideation': return '🚨';
      case 'severe_depression': return '😔';
      case 'mania_indicators': return '⚡';
      case 'dissociation': return '🌫️';
      case 'eating_disorder': return '🍽️';
      case 'substance_abuse': return '🍺';
      case 'abuse_disclosure': return '🛡️';
      case 'significant_stressor': return '😰';
      default: return '📌';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60000);
    const seconds = Math.floor((timestamp % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAcknowledge = () => {
    if (onAcknowledge) {
      onAcknowledge(flag.id, acknowledgeNotes);
      setShowDetails(false);
      setAcknowledgeNotes('');
    }
  };

  return (
    <>
      <div className={`p-4 rounded-lg mb-2 ${getSeverityColor(flag.severity)}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{getIcon(flag.type)}</span>
          <div className="flex-1">
            <h4 className="font-semibold">
              {flag.type.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <p className="text-sm mt-1">"{flag.text}"</p>
            <p className="text-xs mt-2 opacity-75">
              Confidence: {(flag.confidence * 100).toFixed(0)}% • 
              Time: {formatTimestamp(flag.timestamp)}
            </p>
          </div>
          <div className="flex gap-2">
            {showActions && (
              <Button
                size="sm"
                color="ghost"
                onClick={() => setShowDetails(true)}
              >
                Details
              </Button>
            )}
            {flag.severity === 'critical' && (
              <Button
                size="sm"
                color="error"
                onClick={() => window.alert('Emergency protocol activated')}
              >
                Emergency
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal open={showDetails}>
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setShowDetails(false)}>✕</button>
        </form>
        <Modal.Header className="font-bold">
          Clinical Flag Details
        </Modal.Header>
        <Modal.Body>
          <div className="space-y-4">
            <div>
              <label className="font-semibold">Type:</label>
              <p>{flag.type.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <label className="font-semibold">Severity:</label>
              <p className="capitalize">{flag.severity}</p>
            </div>
            <div>
              <label className="font-semibold">Detected Text:</label>
              <p className="italic">"{flag.text}"</p>
            </div>
            <div>
              <label className="font-semibold">Context:</label>
              <p className="text-sm bg-base-200 p-2 rounded">{flag.context}</p>
            </div>
            <div>
              <label className="font-semibold">Confidence:</label>
              <p>{(flag.confidence * 100).toFixed(1)}%</p>
            </div>
            <div>
              <label className="font-semibold">Timestamp:</label>
              <p>{formatTimestamp(flag.timestamp)}</p>
            </div>
            {flag.metadata && (
              <div>
                <label className="font-semibold">Additional Information:</label>
                <pre className="text-xs bg-base-200 p-2 rounded overflow-auto">
                  {JSON.stringify(flag.metadata, null, 2)}
                </pre>
              </div>
            )}
            {showActions && onAcknowledge && (
              <div>
                <label className="font-semibold">Acknowledgment Notes:</label>
                <textarea
                  className="textarea textarea-bordered w-full mt-1"
                  rows={3}
                  value={acknowledgeNotes}
                  onChange={(e) => setAcknowledgeNotes(e.target.value)}
                  placeholder="Add any notes about this flag..."
                />
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Actions>
          <Button color="ghost" onClick={() => setShowDetails(false)}>
            Close
          </Button>
          {showActions && onAcknowledge && (
            <Button color="primary" onClick={handleAcknowledge}>
              Acknowledge
            </Button>
          )}
        </Modal.Actions>
      </Modal>
    </>
  );
};

// Component for displaying multiple flags
interface ClinicalFlagsListProps {
  flags: ClinicalFlag[];
  onAcknowledge?: (flagId: string, notes?: string) => void;
  showActions?: boolean;
  maxFlags?: number;
}

export const ClinicalFlagsList: React.FC<ClinicalFlagsListProps> = ({ 
  flags, 
  onAcknowledge,
  showActions = true,
  maxFlags = 10 
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const displayFlags = showAll ? flags : flags.slice(0, maxFlags);
  const hasMore = flags.length > maxFlags;

  if (flags.length === 0) {
    return null;
  }

  return (
    <Card>
      <Card.Body>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Clinical Flags Detected</h3>
          <span className="badge badge-error">{flags.length}</span>
        </div>
        
        <div className="space-y-2">
          {displayFlags.map((flag) => (
            <ClinicalFlagAlert
              key={flag.id}
              flag={flag}
              onAcknowledge={onAcknowledge}
              showActions={showActions}
            />
          ))}
        </div>

        {hasMore && !showAll && (
          <div className="mt-4 text-center">
            <Button
              size="sm"
              color="ghost"
              onClick={() => setShowAll(true)}
            >
              Show {flags.length - maxFlags} more flags
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}; 