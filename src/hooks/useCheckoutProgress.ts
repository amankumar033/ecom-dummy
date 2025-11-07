import { useState, useCallback } from 'react';

export interface CheckoutStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

export const useCheckoutProgress = () => {
  const [steps, setSteps] = useState<CheckoutStep[]>([
    { id: 'validation', name: 'Validating order', status: 'pending', progress: 0 },
    { id: 'processing', name: 'Processing payment', status: 'pending', progress: 0 },
    { id: 'notification', name: 'Sending notifications', status: 'pending', progress: 0 },
    { id: 'confirmation', name: 'Finalizing order', status: 'pending', progress: 0 }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  const updateStep = useCallback((stepId: string, updates: Partial<CheckoutStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const startStep = useCallback((stepId: string) => {
    updateStep(stepId, { status: 'processing', progress: 0 });
  }, [updateStep]);

  const updateStepProgress = useCallback((stepId: string, progress: number) => {
    updateStep(stepId, { progress });
    
    // Calculate overall progress
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const currentStepProgress = progress / 100;
    const overall = ((completedSteps + currentStepProgress) / totalSteps) * 100;
    setOverallProgress(overall);
  }, [updateStep, steps]);

  const completeStep = useCallback((stepId: string) => {
    updateStep(stepId, { status: 'completed', progress: 100 });
    setCurrentStep(prev => prev + 1);
  }, [updateStep]);

  const errorStep = useCallback((stepId: string, error?: string) => {
    updateStep(stepId, { status: 'error', progress: 0 });
  }, [updateStep]);

  const reset = useCallback(() => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', progress: 0 })));
    setCurrentStep(0);
    setOverallProgress(0);
  }, []);

  return {
    steps,
    currentStep,
    overallProgress,
    startStep,
    updateStepProgress,
    completeStep,
    errorStep,
    reset
  };
};
