import mongoose from 'mongoose';

const { ObjectId } = mongoose.Types;

const StykuParametersSchema = new mongoose.Schema(
  {
    chest: Number,
    highHip: Number,
    lowHip: Number,
    naturalWaist: Number,
    stomachWidth: Number,
    stomachWidth2: Number,
    midNeckGirth: Number,
    bicepLeft: Number,
    lowBicepLeft: Number,
    bicepRight: Number,
    lowBicepRight: Number,
    calfLeft: Number,
    calfRight: Number,
    foreArmLeft: Number,
    foreArmRight: Number,
    midThighLeft: Number,
    midThighRight: Number,
    lhThighLeftLower: Number,
    thighLeft: Number,
    lhThighRightLower: Number,
    thighRight: Number,
    biaFatMassPercent: Number,
  },
  { versionKey: false, _id: false },
);

const BodyCompositionDetailSchema = new mongoose.Schema(
  {
    fatMass: { type: Number, min: 0, max: 100, required: true },
    leanBMC: { type: Number, min: 0, max: 100, required: true },
    totalMass: { type: Number, min: 0, max: 200, required: true },
    fatPercent: { type: Number, min: 0, max: 100, required: true },
  },
  { versionKey: false, _id: false },
);

const PatientInformationDetailSchema = new mongoose.Schema(
  {
    result: { type: Number, min: 0, max: 300, required: true },
  },
  { versionKey: false, _id: false },
);

const PatientInformationSchema = new mongoose.Schema(
  {
    height: { type: PatientInformationDetailSchema },
    weight: { type: PatientInformationDetailSchema },
    age: { type: PatientInformationDetailSchema },
  },
  { versionKey: false, _id: false },
);

const BodyCompositionSchema = new mongoose.Schema(
  {
    leftArm: { type: BodyCompositionDetailSchema },
    leftLeg: { type: BodyCompositionDetailSchema },
    rightArm: { type: BodyCompositionDetailSchema },
    rightLeg: { type: BodyCompositionDetailSchema },
    subTotal: { type: BodyCompositionDetailSchema },
    trunk: { type: BodyCompositionDetailSchema },
    head: { type: BodyCompositionDetailSchema },
  },
  { versionKey: false, _id: false },
);

const AdiposeAndLeanIndicesDetailSchema = new mongoose.Schema(
  {
    result: { type: Number, min: 0, max: 200, required: true },
  },
  { versionKey: false, _id: false },
);

const AdiposeIndicesSchema = new mongoose.Schema(
  {
    androidGynoidRatio: { type: AdiposeAndLeanIndicesDetailSchema },
    fatMassHeight: { type: AdiposeAndLeanIndicesDetailSchema },
    fatTrunkfatLegs: { type: AdiposeAndLeanIndicesDetailSchema },
    totalBodyFat: { type: AdiposeAndLeanIndicesDetailSchema },
    trunkLimbFatMass: { type: AdiposeAndLeanIndicesDetailSchema },
    vatArea: { result: { type: Number, min: 0, max: 10000, required: true } },
    vatMass: { result: { type: Number, min: 0, max: 5000, required: true } },
    vatVolume: { result: { type: Number, min: 0, max: 10000, required: true } },
  },
  { versionKey: false, _id: false },
);

const LeanIndicesSchema = new mongoose.Schema(
  {
    appenLeanHeight: { type: AdiposeAndLeanIndicesDetailSchema },
    leanHeight: { type: AdiposeAndLeanIndicesDetailSchema },
  },
  { versionKey: false, _id: false },
);

const ResultSummaryDetailSchema = new mongoose.Schema(
  {
    bmc: { type: Number, min: 0, max: 10000, required: true },
    fatMass: { type: Number, min: 0, max: 50000, required: true },
    fatPercent: { type: Number, min: 0, max: 100, required: true },
    leanBMC: { type: Number, min: 0, max: 70000, required: true },
    leanMass: { type: Number, min: 0, max: 70000, required: true },
    totalMass: { type: Number, min: 0, max: 100000, required: true },
  },
  { versionKey: false, _id: false },
);

const ResultSummarySchema = new mongoose.Schema(
  {
    head: { type: ResultSummaryDetailSchema },
    leftArm: { type: ResultSummaryDetailSchema },
    leftLeg: { type: ResultSummaryDetailSchema },
    rightArm: { type: ResultSummaryDetailSchema },
    rightLeg: { type: ResultSummaryDetailSchema },
    subtotal: { type: ResultSummaryDetailSchema },
    total: { type: ResultSummaryDetailSchema },
    trunk: { type: ResultSummaryDetailSchema },
  },
  { versionKey: false, _id: false },
);

const DEXASchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, index: true },
    pdfURL: String,
    boneDensityPdfUrl: String,
    imageURL: String,
    patientInformation: PatientInformationSchema,
    bodyComposition: BodyCompositionSchema,
    adiposeIndices: AdiposeIndicesSchema,
    leanIndices: LeanIndicesSchema,
    resultSummary: ResultSummarySchema,
    stykuParameters: StykuParametersSchema,
    score: Number,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { versionKey: false, timestamps: true },
);

DEXASchema.index({ userId: 1, createdAt: 1 });

const DEXAResult = mongoose.model('DEXAResult', DEXASchema);

export default DEXAResult;
