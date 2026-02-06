import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LoanService } from '../services/loan.service';
import { LoanRequestDto, LoanResponseDto } from '../dto/loan.dto';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @ApiOperation({
    summary: 'Get all user loans',
    description: 'Retrieves all loan applications for the authenticated user',
  })
  @ApiOkResponse({
    status: 200,
    description: 'User loans retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized access' })
  @Get()
  getUserLoans(@Request() req: any) {
    console.log('Authenticated user:', req.user);
    const userEmail = req.user?.email || req.user?.username;
    return this.loanService.getUserLoans(userEmail);
  }

  @ApiOperation({
    summary: 'Submit loan request',
    description: 'Submits a loan request for a vehicle', // I would have protected this endpoint and users would be authenticated to access it.
  })
  @ApiCreatedResponse({
    status: 201,
    type: LoanResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid data provided' })
  @Post('apply')
  loanRequest(@Body() loanRequestDto: LoanRequestDto) {
    console.log('Loan request DTO:', loanRequestDto);
    return this.loanService.submitLoanRequest(loanRequestDto);
  }

  @ApiOperation({
    summary: 'Get loan offers',
    description: 'Retrieves loan offers for a given loan application',
  })
  @ApiOkResponse({
    status: 200,
    type: [LoanResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Loan application not found' })
  @Get(':loanId/offers')
  getLoanOffers(@Param('loanId') loanId: number) {
    return this.loanService.getLoanOffers(loanId);
  }

  @ApiOperation({
    summary: 'Accept loan offer',
    description: 'Accepts a specific loan offer for a given loan application',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Loan offer accepted successfully',
  })
  @ApiNotFoundResponse({ description: 'Loan application or offer not found' })
  @Post(':loanId/offers/:offerId/accept')
  acceptLoanOffer(
    @Param('loanId') loanId: number,
    @Param('offerId') offerId: number,
  ) {
    return this.loanService.acceptLoanOffer(loanId, offerId);
  }

  @ApiOperation({
    summary: 'Reject loan offer',
    description: 'Rejects a specific loan offer for a given loan application',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Loan offer rejected successfully',
  })
  @ApiNotFoundResponse({ description: 'Loan application or offer not found' })
  @Post(':loanId/offers/:offerId/reject')
  rejectLoanOffer(
    @Param('loanId') loanId: number,
    @Param('offerId') offerId: number,
  ) {
    return this.loanService.rejectLoanOffer(loanId, offerId);
  }

  @ApiOperation({
    summary: 'Get loan application status',
    description: 'Retrieves the current status of a loan application',
  })
  @ApiOkResponse({
    status: 200,
    type: LoanResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Loan application not found' })
  @Get(':loanId/status')
  getLoanStatus(@Param('loanId') loanId: number) {
    return this.loanService.getLoanStatus(loanId);
  }
}
