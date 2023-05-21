const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GaslessLayer2", function () {
  let gaslessLayer2;
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    const GaslessLayer2 = await ethers.getContractFactory("GaslessLayer2");
    const Token = await ethers.getContractFactory("Token");

    [owner, addr1, addr2] = await ethers.getSigners();

    gaslessLayer2 = await GaslessLayer2.deploy();
    await gaslessLayer2.deployed();

    token = await Token.deploy();
    await token.deployed();

    // Mint tokens to owner
    await token.mint(owner.address, ethers.utils.parseEther("1000"));
  });

  it("should deposit and withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    await gaslessLayer2.depositETH({ value: depositAmount });

    const balanceBeforeWithdrawal = await ethers.provider.getBalance(owner.address);

    const withdrawTx = await gaslessLayer2.withdrawETH(depositAmount);
    await withdrawTx.wait();

    const balanceAfterWithdrawal = await ethers.provider.getBalance(owner.address);

    expect(balanceAfterWithdrawal).to.be.gt(balanceBeforeWithdrawal);
  });

  it("should deposit and withdraw tokens", async function () {
    const depositAmount = ethers.utils.parseEther("100");
    await token.connect(owner).approve(gaslessLayer2.address, depositAmount);
    await gaslessLayer2.depositToken(token.address, depositAmount);

    const balanceBeforeWithdrawal = await token.balanceOf(owner.address);

    const withdrawTx = await gaslessLayer2.withdrawToken(token.address, depositAmount);
    await withdrawTx.wait();

    const balanceAfterWithdrawal = await token.balanceOf(owner.address);

    expect(balanceAfterWithdrawal).to.be.gt(balanceBeforeWithdrawal);
  });

  it("should trade tokens on Uniswap", async function () {
    const amountIn = ethers.utils.parseEther("10");
    const amountOutMin = ethers.utils.parseEther("9");
    const deadline = Math.floor(Date.now() / 1000) + 3600; // Set deadline 1 hour from now

    const tradeTx = await gaslessLayer2.trade(
      token.address, // tokenIn
      ethers.constants.AddressZero, // tokenOut (ETH)
      amountIn,
      amountOutMin,
      deadline
    );
    await tradeTx.wait();

    const ethBalance = await ethers.provider.getBalance(owner.address);
    expect(ethBalance).to.be.gt(ethers.utils.parseEther("0"));
  });
});
