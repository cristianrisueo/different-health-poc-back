import { tool } from '@langchain/core/tools';
import mongoose from 'mongoose';
import { z } from 'zod';

import DEXAResult from '../../../models/DEXAResult.model';

const dexaToolSchema = z.object({
  userId: z.string().describe('The ID of the user for whom the scan is requested.'),
});

export const getLatestBodyCompositionScan = tool(
  async (args: any): Promise<string> => {
    try {
      const rawArgs = typeof args === 'string' ? JSON.parse(args) : args;
      const parsedArgs = dexaToolSchema.parse(rawArgs);
      const { userId } = parsedArgs;

      if (!userId) {
        return 'Error: The "userId" field was not found in the tool arguments.';
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return `The provided user ID ('${userId}') is not a valid ObjectId.`;
      }

      const result = await DEXAResult.findOne({ userId }).sort({ createdAt: -1 });

      if (!result) {
        return 'No body composition (DEXA) scan results were found for this user.';
      }

      const summary = {
        scanDate: result.createdAt,
        totalBodyFatPercent: result.adiposeIndices?.totalBodyFat?.result,
        totalFatMassKg: result.resultSummary?.total?.fatMass ? result.resultSummary.total.fatMass / 1000 : 0,
        totalLeanMassKg: result.resultSummary?.total?.leanMass ? result.resultSummary.total.leanMass / 1000 : 0,
        androidGynoidRatio: result.adiposeIndices?.androidGynoidRatio?.result,
        vatMassGrams: result.adiposeIndices?.vatMass?.result,
      };

      return JSON.stringify(summary);
    } catch (error) {
      console.error('Error in getLatestBodyCompositionScan tool:', error);
      return `There was an error while trying to retrieve the body composition data: ${error}`;
    }
  },

  {
    name: 'getLatestBodyCompositionScan',
    description: `
    Retrieves the most recent body composition (DEXA) scan of a user.
    Returns detailed data on body fat, lean mass, fat percentages, and more.
    Use this when the user asks about their body composition, body fat percentage, muscle mass, or DEXA results.
  `,
    schema: dexaToolSchema as any,
  },
);
