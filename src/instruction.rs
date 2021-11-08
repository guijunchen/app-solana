use crate::error::CustomError::InvalidInstruction;
use solana_program::{program_error::ProgramError, msg};
use borsh::BorshDeserialize;

pub enum Instruction{
    Deposit{
        amount: u64, //存
    },
    Withdraw{
        nonce: u8, //取
    },
    CreateProgramAssociatedAddresse,
}

impl Instruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        msg!("{:?}", input);
        let (tag, rest) = input.split_first().ok_or(InvalidInstruction)?; // rest 除第一字节外的
        msg!("tag {:?} rest {:?}", tag, rest);
        Ok(match tag {
            0 => {
                let amount = u64::try_from_slice(rest).unwrap();
                msg!("amount {:?}", amount);
                Instruction::Deposit{
                    amount,
                }
            },

            1 => {
                let nonce = u8::try_from_slice(rest).unwrap();
                Instruction::Withdraw{
                    nonce,
                }
            },

            2 => {
                Instruction::CreateProgramAssociatedAddresse
            },

            _ => return Err(InvalidInstruction.into()),
        })
    }
}