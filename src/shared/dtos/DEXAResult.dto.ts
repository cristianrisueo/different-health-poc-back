interface BodyRegionComposition {
  fatMass: number;
  leanBMC: number;
  totalMass: number;
  fatPercent: number;
}

export interface ResultSummaryRegionComposition extends BodyRegionComposition {
  bmc: number;
  leanMass: number;
}

type AtomicResult = { result: number };

export interface DEXAResultDTO {
  _id: string;
  userId: string;
  pdfURL?: string;
  imageURL?: string;
  patientInformation: PatientInformation;
  bodyComposition: BodyComposition;
  adiposeIndices: AdiposeIndices;
  leanIndices: LeanIndices;
  resultSummary: ResultSummary;
  createdAt: Date;
  updatedAt: Date;
  score: number;
}

interface PatientInformation {
  age: AtomicResult;
  height: AtomicResult;
  weight: AtomicResult;
}

export interface LeanIndices {
  appenLeanHeight: AtomicResult;
  leanHeight: AtomicResult;
}
export interface BodyComposition {
  leftArm: BodyRegionComposition;
  leftLeg: BodyRegionComposition;
  rightArm: BodyRegionComposition;
  rightLeg: BodyRegionComposition;
  trunk: BodyRegionComposition;
  head: BodyRegionComposition;
}

export interface AdiposeIndices {
  androidGynoidRatio: AtomicResult;
  fatMassHeight: AtomicResult;
  fatTrunkfatLegs: AtomicResult;
  totalBodyFat: AtomicResult;
  trunkLimbFatMass: AtomicResult;
  vatArea: AtomicResult;
  vatMass: AtomicResult;
  vatVolume: AtomicResult;
}

export interface ResultSummary {
  head: ResultSummaryRegionComposition;
  leftArm: ResultSummaryRegionComposition;
  leftLeg: ResultSummaryRegionComposition;
  rightArm: ResultSummaryRegionComposition;
  rightLeg: ResultSummaryRegionComposition;
  subtotal: ResultSummaryRegionComposition;
  total: ResultSummaryRegionComposition;
  trunk: ResultSummaryRegionComposition;
}
