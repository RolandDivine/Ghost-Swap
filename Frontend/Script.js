import { ethers } from 'ethers';

// Contract addresses
const gaslessLayer2Address = '0x...'; // Address of the GaslessLayer2 contract
const uniswapRouterAddress = '0x...'; // Address of the Uniswap Router contract

// Contract ABIs
const gaslessLayer2Abi = [...]; // ABI of the GaslessLayer2 contract
const uniswapRouterAbi = [...]; // ABI of the Uniswap Router contract

// Initialize provider and signer
const provider = new ethers.providers.JsonRpcProvider('https://ropsten.infura.io/v3/YOUR_INFURA_PROJECT_ID');
const signer = provider.getSigner();

// GaslessLayer2 contract instance
const gaslessLayer2Contract = new ethers.Contract(gaslessLayer2Address, gaslessLayer2Abi, signer);

// Uniswap Router contract instance
const uniswapRouterContract = new ethers.Contract(uniswapRouterAddress, uniswapRouterAbi, signer);

// Function to deposit ETH
async function depositETH(amount) {
  const depositTx = await gaslessLayer2Contract.depositETH({ value: amount });
  await depositTx.wait();
}

// Function to deposit ERC20 token
async function depositToken(tokenAddress, amount) {
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
  const approveTx = await tokenContract.approve(gaslessLayer2Address, amount);
  await approveTx.wait();

  const depositTx = await gaslessLayer2Contract.depositToken(tokenAddress, amount);
  await depositTx.wait();
}

// Function to withdraw ETH
async function withdrawETH(amount) {
  const nonce = await gaslessLayer2Contract.nonces(signer.getAddress());
  const messageHash = await gaslessLayer2Contract.getMessageHash(signer.getAddress(), ethers.constants.AddressZero, amount, nonce);

  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  const withdrawTx = await gaslessLayer2Contract.withdrawETH(amount, nonce, signature);
  await withdrawTx.wait();
}

// Function to withdraw ERC20 token
async function withdrawToken(tokenAddress, amount) {
  const nonce = await gaslessLayer2Contract.nonces(signer.getAddress());
  const messageHash = await gaslessLayer2Contract.getMessageHash(signer.getAddress(), tokenAddress, amount, nonce);

  const signature = await signer.signMessage(ethers.utils.arrayify(messageHash));
  const withdrawTx = await gaslessLayer2Contract.withdrawToken(tokenAddress, amount, nonce, signature);
  await withdrawTx.wait();
}

// Function to trade tokens on Uniswap
async function trade(tokenInAddress, tokenOutAddress, amountIn, amountOutMin) {
  const tokenInContract = new ethers.Contract(tokenInAddress, tokenAbi, signer);
  const tokenOutContract = new ethers.Contract(tokenOutAddress, tokenAbi, signer);

  const path = [tokenInAddress, tokenOutAddress];
  const deadline = Math.floor(Date.now() / 1000) + 3600; // Set deadline to 1 hour from now

  const approveTx = await tokenInContract.approve(uniswapRouterAddress, amountIn);
  await approveTx.wait();

  const tradeTx = await uniswapRouterContract.swapExactTokensForTokens(amountIn, amountOutMin, path, signer.getAddress(), deadline);
  await tradeTx.wait();
}

// Call the functions as needed
depositETH(1);
depositToken('0x...', 100);
withdrawETH(1);
withdrawToken('0x...', 50);
trade('0x...', '0x...', 100, 0);

// Function to get the token balance of an address
async function getTokenBalance(tokenAddress, address) {
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  const balance = await tokenContract.balanceOf(address);
  return balance.toString();
}

// Example usage to get token balance
const tokenAddress = '0x...'; // Token address
const address = '0x...'; // Ethereum address
const balance = await getTokenBalance(tokenAddress, address);
console.log(`Token balance: ${balance}`);

