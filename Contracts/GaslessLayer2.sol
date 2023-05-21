// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IUniswapRouter {
    function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts);
}

contract GaslessLayer2 {
    mapping(address => mapping(address => uint256)) public tokenBalances;
    mapping(address => uint256) public nonces;
    mapping(address => mapping(uint256 => bool)) public usedSignatures;

    event Deposit(address indexed account, address indexed token, uint256 amount);
    event Withdrawal(address indexed account, address indexed token, uint256 amount);
    event Trade(address indexed account, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    address public uniswapRouterAddress; // Address of the Uniswap router

    constructor(address _uniswapRouterAddress) {
        uniswapRouterAddress = _uniswapRouterAddress;
    }

    function depositETH() external payable {
        tokenBalances[msg.sender][address(0)] += msg.value;
        emit Deposit(msg.sender, address(0), msg.value);
    }

    function depositToken(address token, uint256 amount) external {
        require(token != address(0), "Invalid token address");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenBalances[msg.sender][token] += amount;

        emit Deposit(msg.sender, token, amount);
    }

    function withdrawETH(uint256 amount, uint256 nonce, bytes memory signature) external {
        require(tokenBalances[msg.sender][address(0)] >= amount, "Insufficient ETH balance");
        require(!usedSignatures[msg.sender][nonce], "Signature already used");

        bytes32 messageHash = getMessageHash(msg.sender, address(0), amount, nonce);
        require(verifySignature(messageHash, signature), "Invalid signature");

        tokenBalances[msg.sender][address(0)] -= amount;
        emit Withdrawal(msg.sender, address(0), amount);
        usedSignatures[msg.sender][nonce] = true;

        payable(msg.sender).transfer(amount);
    }

    function withdrawToken(address token, uint256 amount, uint256 nonce, bytes memory signature) external {
        require(token != address(0), "Invalid token address");
        require(tokenBalances[msg.sender][token] >= amount, "Insufficient token balance");
        require(!usedSignatures[msg.sender][nonce], "Signature already used");

        bytes32 messageHash = getMessageHash(msg.sender, token, amount, nonce);
        require(verifySignature(messageHash, signature), "Invalid signature");

        tokenBalances[msg.sender][token] -= amount;
        emit Withdrawal(msg.sender, token, amount);
        usedSignatures[msg.sender][nonce] = true;

        IERC20(token).transfer(msg.sender, amount);
    }

    function trade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, uint256 deadline, uint256 nonce, bytes memory signature) external {
        require(tokenBalances[msg.sender][tokenIn] >= amountIn, "Insufficient tokenIn balance");
        require(!usedSignatures[msg.sender][nonce], "Signature already used");

        bytes32 messageHash = getMessageHash(msg.sender, tokenIn, amountIn, nonce);
                require(verifySignature(messageHash, signature), "Invalid signature");

        tokenBalances[msg.sender][tokenIn] -= amountIn;
        emit Trade(msg.sender, tokenIn, tokenOut, amountIn, amountOutMin);
        usedSignatures[msg.sender][nonce] = true;

        // Perform the token swap using Uniswap
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        IUniswapRouter uniswapRouter = IUniswapRouter(uniswapRouterAddress);
        uint256[] memory amounts = uniswapRouter.swapExactTokensForTokens(amountIn, amountOutMin, path, msg.sender, deadline);

        // Ensure that the actual amount received is greater than or equal to the minimum expected amount
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient amountOut");

        // Update the token balances
        tokenBalances[msg.sender][tokenOut] += amounts[amounts.length - 1];
    }

    function getMessageHash(address account, address token, uint256 amount, uint256 nonce) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(account, token, amount, nonce));
    }

    function verifySignature(bytes32 messageHash, bytes memory signature) internal view returns (bool) {
        address recoveredSigner = recoverSigner(messageHash, signature);
        return recoveredSigner == msg.sender;
    }

    function recoverSigner(bytes32 messageHash, bytes memory signature) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        if (signature.length != 65) {
            return address(0);
        }

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return address(0);
        }

        return ecrecover(messageHash, v, r, s);
    }
}

