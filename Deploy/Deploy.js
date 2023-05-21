const { ethers, upgrades } = require("hardhat");

async function main() {
  // Deploy GaslessLayer2 contract
  const GaslessLayer2 = await ethers.getContractFactory("GaslessLayer2");
  const gaslessLayer2 = await upgrades.deployProxy(GaslessLayer2);
  await gaslessLayer2.deployed();
  console.log("GaslessLayer2 deployed to:", gaslessLayer2.address);

  // Deploy Token contract
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.deployed();
  console.log("Token deployed to:", token.address);

  // Print contract addresses for easy reference
  console.log("Contract addresses:");
  console.log("- GaslessLayer2:", gaslessLayer2.address);
  console.log("- Token:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
