import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../common/logger/logger.service';
import { Loan, LoanStatus } from '../entities/loan.entity';
import { LoanOfferDto, LoanRequestDto } from '../dto/loan.dto';
import { Vehicle } from 'src/vehicles/entities/vehicle.entity';
import { VehicleService } from 'src/vehicles/services/vehicle.service';
import { InternalServerErrorException } from 'src/common/exceptions/app-error.exception';
import { Offer } from '../entities/offer.entity';

@Injectable()
export class LoanService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    private loggerService: LoggerService,
    private vehicleService: VehicleService,
  ) {}

  async submitLoanRequest(loanRequest: LoanRequestDto) {
    const { vehicleId, applicantName, monthlyIncome, requestedAmount } =
      loanRequest;
    // Ensure we always have an idempotency key (DB requires NOT NULL)
    const idempotencyKey = loanRequest.idempotencyKey || `auto-${randomUUID()}`;
    console.log('Submitting loan request:', { ...loanRequest, idempotencyKey });
    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: vehicleId },
      });

      if (!vehicle)
        throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);

      const existingApplication = await this.loanRepository.findOne({
        where: { idempotencyKey },
      });

      if (existingApplication)
        throw new BadRequestException('Duplicate loan application');
      const marketValue = await this.vehicleService.vehicleValuation(
        vehicle.vin,
      );

      const maxLoan = marketValue.estimatedValue * 0.7;

      if (requestedAmount > maxLoan)
        throw new BadRequestException(
          'Maximum loan amount exceeded for this vehicle',
        );

      const creditScore = this.checkCreditScore();

      const loan = this.loanRepository.create({
        applicantEmail: loanRequest.applicantEmail,
        applicantName: applicantName,
        monthlyIncome: monthlyIncome,
        requestedAmount: requestedAmount,
        idempotencyKey,
        vehicle: vehicle,
        ltv: requestedAmount / marketValue.estimatedValue,
        creditScore,
      });

      // Check if income is sufficient using 30% of income
      const monthlyRepaymentEstimate = requestedAmount / 24;

      if (monthlyRepaymentEstimate > monthlyIncome * 0.3) {
        loan.status = LoanStatus.REJECTED;
        loan.rejectionReason = 'Insufficient income';
        loan.rejectedBy = 'System';
        await this.loanRepository.save(loan); // Save the rejected loans as well so informed decisions can be made later whether or not to allow future loans
        throw new BadRequestException('Loan request not allowed'); // No need to specify reason for security
      }

      if (creditScore < 600) {
        loan.status = LoanStatus.REJECTED;
        loan.rejectionReason = 'Low credit score';
        loan.rejectedBy = 'System';
        await this.loanRepository.save(loan); // Save the rejected loans as well so informed decisions can be made later whether or not to allow future loans
        throw new BadRequestException('Loan request not allowed');
      }

      loan.status = LoanStatus.SUBMITTED;
      const savedLoan = await this.loanRepository.save(loan);
      return {
        message: 'Loan request submitted successfully',
        loanId: savedLoan.id,
        status: savedLoan.status,
        requestedAmount: savedLoan.requestedAmount,
        applicantName: savedLoan.applicantName,
        applicantEmail: savedLoan.applicantEmail,
        monthlyIncome: savedLoan.monthlyIncome,
        vehicle,
      };
    } catch (error) {
      this.loggerService.logError(
        `Error submitting loan request for vehicle ID ${vehicleId}: ${error.message}`,
        'LoanService.submitLoanRequest',
        {
          vehicleId,
          applicantEmail: loanRequest.applicantEmail,
          requestedAmount,
        },
      );
      throw error;
    }
  }

  async getLoanOffers(loanId: number) {
    try {
      const loan = await this.loanRepository.findOne({
        where: { id: loanId },
        relations: ['vehicle'],
      });

      if (!loan)
        throw new NotFoundException(`Loan with ID ${loanId} not found`);

      if (loan.status !== LoanStatus.SUBMITTED) {
        throw new BadRequestException(
          'Loan offers can only be generated for submitted loans',
        );
      }

      // Check if offers already exist for this loan, if yes return them instead of generating new ones
      const existingOffers = await this.offerRepository.find({
        where: { loan: { id: loanId } },
      });

      if (existingOffers.length > 0) {
        const offerDtos: Array<LoanOfferDto> = existingOffers.map((offer) => {
          const offerDto = new LoanOfferDto();
          offerDto.offerId = offer.id;
          offerDto.loanId = offer.loan.id;
          offerDto.offerType = offer.offerType;
          offerDto.interestRate = offer.interestRate;
          offerDto.monthlyPayment = offer.monthlyPayment;
          offerDto.tenureMonths = offer.tenureMonths;
          offerDto.totalInterest = offer.totalInterest;
          return offerDto;
        });
        return offerDtos;
      }

      const offers = this.generateLoanOffers(loan);
      const offerEntities = offers.map((offer) =>
        this.offerRepository.create({
          offerType: offer.offerType,
          interestRate: offer.interestRate,
          monthlyPayment: offer.monthlyPayment,
          tenureMonths: offer.loanTerm,
          totalInterest: offer.totalInterest,
          amount: offer.loanAmount,
          loan: loan,
        }),
      );
      console.log('Saving generated loan offers to database:', offerEntities);
      const dbOffers = await this.offerRepository.save(offerEntities);
      console.log('Generated loan offers:', dbOffers);
      const offerDtos: Array<LoanOfferDto> = dbOffers.map((offer) => {
        const offerDto = new LoanOfferDto();
        offerDto.offerId = offer.id;
        offerDto.loanId = offer.loan.id;
        offerDto.offerType = offer.offerType;
        offerDto.interestRate = offer.interestRate;
        offerDto.monthlyPayment = offer.monthlyPayment;
        offerDto.tenureMonths = offer.tenureMonths;
        offerDto.totalInterest = offer.totalInterest;
        return offerDto;
      });
      return offerDtos;
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error generating loan offers for loan ID ${loanId}: ${error.message}`,
        'LoanService.getLoanOffers',
        {
          loanId,
        },
      );

      throw new InternalServerErrorException(
        'Failed to generate loan offers. Please try again later.',
        { loanId },
      );
    }
  }

  async updateLoanStatus(loanId: number, status: LoanStatus) {
    try {
      const loan = await this.loanRepository.findOne({
        where: { id: loanId },
      });

      if (!loan)
        throw new NotFoundException(`Loan with ID ${loanId} not found`);

      loan.status = status;
      await this.loanRepository.save(loan);
      return { message: `Loan status updated to ${status}` };
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error updating loan status for loan ID ${loanId}: ${error.message}`,
        'LoanService.updateLoanStatus',
        {
          loanId,
          newStatus: status,
        },
      );

      throw new InternalServerErrorException(
        'Failed to update loan status. Please try again later.',
        { loanId },
      );
    }
  }

  private generateLoanOffers(loan: Loan) {
    // Generate up to 3 different loan offers with varying tenures
    // In production, I would make this more sophisticated based on credit score, vehicle value, market conditions, etc.
    const baseInterestRate = 0.05 + (loan.creditScore < 700 ? 0.02 : 0);

    // Offer 1: Short-term (12 months) - lower interest, higher monthly payment
    const offer1 = {
      offerType: 'express',
      loanTerm: 12,
      loanAmount: loan.requestedAmount,
      interestRate: baseInterestRate - 0.005, // Slight discount for quick repayment
      monthlyPayment: this.calculateMonthlyPayment(
        loan.requestedAmount,
        baseInterestRate - 0.005,
        12,
      ),
      totalInterest: this.calculateTotalInterest(
        loan.requestedAmount,
        baseInterestRate - 0.005,
        12,
      ),
    };

    // Offer 2: Standard (24 months) - standard interest, moderate monthly payment
    const offer2 = {
      offerType: 'standard',
      loanTerm: 24,
      loanAmount: loan.requestedAmount,
      interestRate: baseInterestRate,
      monthlyPayment: this.calculateMonthlyPayment(
        loan.requestedAmount,
        baseInterestRate,
        24,
      ),
      totalInterest: this.calculateTotalInterest(
        loan.requestedAmount,
        baseInterestRate,
        24,
      ),
    };

    // Offer 3: Flexible (36 months) - higher interest, lower monthly payment
    const offer3 = {
      offerType: 'flexible',
      loanTerm: 36,
      loanAmount: loan.requestedAmount,
      interestRate: baseInterestRate + 0.01, // Premium for extended repayment
      monthlyPayment: this.calculateMonthlyPayment(
        loan.requestedAmount,
        baseInterestRate + 0.01,
        36,
      ),
      totalInterest: this.calculateTotalInterest(
        loan.requestedAmount,
        baseInterestRate + 0.01,
        36,
      ),
    };

    return [offer1, offer2, offer3];
  }

  private calculateMonthlyPayment(
    principal: number,
    annualRate: number,
    months: number,
  ): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
      return principal / months;
    }
    const payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
      (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment * 100) / 100;
  }

  private calculateTotalInterest(
    principal: number,
    annualRate: number,
    months: number,
  ): number {
    const monthlyPayment = this.calculateMonthlyPayment(
      principal,
      annualRate,
      months,
    );
    return Math.round((monthlyPayment * months - principal) * 100) / 100;
  }

  private checkCreditScore() {
    // In production, I would integrate with a credit bureau API to get real credit score for the applicant.
    // I would also check for bad credit history, existing loans and other factors, this would be used to determine loan eligibility and the credit score.
    return Math.floor(Math.random() * 300) + 500;
  }

  async acceptLoanOffer(loanId: number, offerId: number) {
    try {
      const loan = await this.loanRepository.findOne({
        where: { id: loanId },
        relations: ['vehicle'],
      });

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${loanId} not found`);
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId, loan: { id: loanId } },
        relations: ['loan'],
      });

      if (!offer) {
        throw new NotFoundException(
          `Offer with ID ${offerId} not found for loan ${loanId}`,
        );
      }

      // Update loan status to APPROVED
      loan.status = LoanStatus.APPROVED;
      await this.loanRepository.save(loan);

      this.loggerService.log(
        `Loan offer ${offerId} accepted for loan ID ${loanId}. Monthly payment: ${offer.monthlyPayment}, Tenure: ${offer.tenureMonths} months`,
        'LoanService.acceptLoanOffer',
      );

      return {
        message:
          'Loan offer accepted successfully and would be disbursed shortly',
        loanId: loan.id,
        offerId: offer.id,
        status: loan.status,
        offerDetails: {
          offerType: offer.offerType,
          interestRate: offer.interestRate,
          monthlyPayment: offer.monthlyPayment,
          tenureMonths: offer.tenureMonths,
          totalInterest: offer.totalInterest,
        },
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error accepting loan offer for loan ID ${loanId}: ${error.message}`,
        'LoanService.acceptLoanOffer',
        { loanId, offerId },
      );

      throw new InternalServerErrorException(
        'Failed to accept loan offer. Please try again later.',
        { loanId, offerId },
      );
    }
  }

  async rejectLoanOffer(loanId: number, offerId: number) {
    try {
      const loan = await this.loanRepository.findOne({
        where: { id: loanId },
      });

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${loanId} not found`);
      }

      const offer = await this.offerRepository.findOne({
        where: { id: offerId, loan: { id: loanId } },
      });

      if (!offer) {
        throw new NotFoundException(
          `Offer with ID ${offerId} not found for loan ${loanId}`,
        );
      }

      // Delete the rejected offer
      await this.offerRepository.remove(offer);

      this.loggerService.log(
        `Loan offer ${offerId} rejected for loan ID ${loanId}`,
        'LoanService.rejectLoanOffer',
      );

      return {
        message: 'Loan offer rejected successfully',
        loanId: loan.id,
        offerId: offer.id,
        remainingOffers: await this.offerRepository.count({
          where: { loan: { id: loanId } },
        }),
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error rejecting loan offer for loan ID ${loanId}: ${error.message}`,
        'LoanService.rejectLoanOffer',
        { loanId, offerId },
      );

      throw new InternalServerErrorException(
        'Failed to reject loan offer. Please try again later.',
        { loanId, offerId },
      );
    }
  }

  async getLoanStatus(loanId: number) {
    try {
      const loan = await this.loanRepository.findOne({
        where: { id: loanId },
        relations: ['vehicle'],
      });

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${loanId} not found`);
      }

      const offers = await this.offerRepository.find({
        where: { loan: { id: loanId } },
      });

      return {
        message: 'Loan status retrieved successfully',
        loanId: loan.id,
        applicantName: loan.applicantName,
        applicantEmail: loan.applicantEmail,
        status: loan.status,
        requestedAmount: loan.requestedAmount,
        monthlyIncome: loan.monthlyIncome,
        vehicle: {
          id: loan.vehicle.id,
          vin: loan.vehicle.vin,
          make: loan.vehicle.make,
          model: loan.vehicle.model,
          year: loan.vehicle.year,
        },
        availableOffers: offers.length,
        rejectionReason: loan.rejectionReason || null,
        createdAt: loan.createdAt,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error retrieving loan status for loan ID ${loanId}: ${error.message}`,
        'LoanService.getLoanStatus',
        { loanId },
      );

      throw new InternalServerErrorException(
        'Failed to retrieve loan status. Please try again later.',
        { loanId },
      );
    }
  }

  async getUserLoans(userEmail: string) {
    try {
      if (!userEmail) {
        throw new BadRequestException('User email is required');
      }

      const loans = await this.loanRepository.find({
        where: { applicantEmail: userEmail },
        relations: ['vehicle'],
        order: { createdAt: 'DESC' },
      });

      if (loans.length === 0) {
        this.loggerService.log(
          `No loans found for user: ${userEmail}`,
          'LoanService.getUserLoans',
        );
        return {
          message: 'No loan applications found for this user',
          data: [],
          total: 0,
        };
      }

      // Map loans with their offer counts
      const loansWithOffers = await Promise.all(
        loans.map(async (loan) => {
          const offerCount = await this.offerRepository.count({
            where: { loan: { id: loan.id } },
          });

          return {
            loanId: loan.id,
            applicantName: loan.applicantName,
            applicantEmail: loan.applicantEmail,
            status: loan.status,
            requestedAmount: loan.requestedAmount,
            monthlyIncome: loan.monthlyIncome,
            ltv: loan.ltv,
            vehicle: {
              id: loan.vehicle.id,
              vin: loan.vehicle.vin,
              make: loan.vehicle.make,
              model: loan.vehicle.model,
              year: loan.vehicle.year,
            },
            availableOffers: offerCount,
            rejectionReason: loan.rejectionReason || null,
            createdAt: loan.createdAt,
          };
        }),
      );

      this.loggerService.log(
        `Retrieved ${loansWithOffers.length} loans for user: ${userEmail}`,
        'LoanService.getUserLoans',
      );

      return {
        message: 'User loan applications retrieved successfully',
        data: loansWithOffers,
        total: loansWithOffers.length,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.constructor.name.includes('Exception')
      ) {
        throw error;
      }

      this.loggerService.logError(
        `Error retrieving loans for user ${userEmail}: ${error.message}`,
        'LoanService.getUserLoans',
        { userEmail },
      );

      throw new InternalServerErrorException(
        'Failed to retrieve user loans. Please try again later.',
        { userEmail },
      );
    }
  }
}
