export {
  hasPriorityProductGuidanceIntent,
  isAmbiguousNeedInput,
  isBasculaAvailabilityAsk,
  isDifferenceQuestionIntent,
  isExplicitFamilyMenuAsk,
} from "../application/catalog-intents";

export {
  isCapacityResolutionHelpIntent,
  isPriceObjectionIntent,
  isProductDefinitionIntent,
  isScaleUseExplanationIntent,
} from "../application/guidance";

export {
  detectClientRecognitionChoice,
  detectEquipmentChoice,
  detectExistingClientConfirmationChoice,
} from "../application/commercial";

export {
  detectGuidedBalanzaProfile,
  detectIndustrialGuidedMode,
  guidedProfileFromUsageContext,
  isHeavyDutyWeightIntent,
} from "../application/guided-profiles";
