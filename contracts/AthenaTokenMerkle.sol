pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";


/**
 * @title AthenaTokenMerkle
 * @dev ERC20 Token with reward mechanisms using Merkle Trees for off-chain data verification.
 */
contract AthenaTokenMerkle is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using MerkleProofUpgradeable for bytes32[];

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Maximum token supply
    uint256 public constant MAX_SUPPLY = 500_000_000 * 10 ** 18; // 500 million tokens with 18 decimals

    // Reward period management
    uint256 public currentPeriod;

    // Merkle root per period
    mapping(uint256 => bytes32) public merkleRoots;

    // Tracks whether a user has claimed in a given period
    mapping(uint256 => mapping(address => uint256)) public hasClaimed;

    // Tracks daily claimed amounts per user
    mapping(address => mapping(uint256 => uint256)) public dailyClaimed;

    // Events
    event RewardClaimed(address indexed user, uint256 amount, uint256 period);
    event MerkleRootUpdated(uint256 indexed period, bytes32 merkleRoot);
    event AdminRoleGranted(address indexed account, address indexed sender);
    event AdminRoleRevoked(address indexed account, address indexed sender);

    // Errors
    error InvalidPeriod(uint256 period);
    error RewardAlreadyClaimed(address user, uint256 period);
    error InvalidMerkleRoot();
    error InvalidMerkleProof();
    error ZeroAmount();
    error MerkleRootNotSet(uint256 period);
    error MaxSupplyExceeded();
    error TokenTransferWhilePaused();
    error ClaimAmountExceedsDailyLimit(uint256 requested, uint256 dailyLimit);

    // Storage gap for upgradeability
    uint256[50] private __gap;

    /**
     * @dev Initializes the contract, replacing the constructor in upgradeable contracts.
     * @param name The name of the ERC20 token.
     * @param symbol The symbol of the ERC20 token.
     * @param admin The address of the admin account.
     */
    function initialize(
        string memory name,
        string memory symbol,
        address admin
    ) public initializer {
        __ERC20_init(name, symbol);
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        // Set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(ADMIN_ROLE, admin);

        // Initialize the current period
        currentPeriod = 1;
    }

    /**
     * @dev Updates the Merkle root for the current period. Only callable by an account with ADMIN_ROLE.
     * @param merkleRoot The Merkle root representing user rewards for the current period.
     */
    function updateMerkleRoot(bytes32 merkleRoot) external onlyRole(ADMIN_ROLE) whenNotPaused {
        if (merkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        // Store the Merkle root for the current period
        merkleRoots[currentPeriod] = merkleRoot;

        emit MerkleRootUpdated(currentPeriod, merkleRoot);

        // Advance to the next period
        currentPeriod += 1;
    }

    /**
     * @notice Claims the reward for a specific period using a Merkle proof.
     * @param period The period for which to claim rewards.
     * @param amount The amount of tokens to claim.
     * @param allowedAmount The maximum amount allowed for the user.
     * @param dailyLimit The daily limit of tokens the user is allowed to claim.
     * @param merkleProof The Merkle proof to validate the claim.
     */
    function claimReward(
        uint256 period,
        uint256 amount,
        uint256 allowedAmount,
        uint256 dailyLimit,
        bytes32[] calldata merkleProof
    ) external whenNotPaused nonReentrant {
        if (period == 0 || period >= currentPeriod) revert InvalidPeriod(period);
        if (hasClaimed[period][msg.sender] + amount > allowedAmount)
            revert RewardAlreadyClaimed(msg.sender, period);

        bytes32 merkleRoot = merkleRoots[period];
        if (merkleRoot == bytes32(0)) revert MerkleRootNotSet(period);
        if (amount == 0) revert ZeroAmount();

        // Verify daily limit
        uint256 today = block.timestamp / 1 days;
        uint256 userDailyClaimed = dailyClaimed[msg.sender][today];
        if (userDailyClaimed + amount > dailyLimit)
            revert ClaimAmountExceedsDailyLimit(userDailyClaimed + amount, dailyLimit);

        // Construct the leaf node from user address, allowed amount, and daily limit
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, allowedAmount, dailyLimit));

        // Verify the Merkle proof
        if (!MerkleProofUpgradeable.verify(merkleProof, merkleRoot, leaf)) revert InvalidMerkleProof();

        // Update claimed amounts
        hasClaimed[period][msg.sender] += amount;
        dailyClaimed[msg.sender][today] = userDailyClaimed + amount;

        // Mint the reward tokens to the user
        _mint(msg.sender, amount);

        emit RewardClaimed(msg.sender, amount, period);
    }

    /**
     * @dev Mints new tokens, ensuring that the total supply does not exceed the maximum supply.
     * @param account The address to receive the minted tokens.
     * @param amount The number of tokens to be minted.
     */
    function _mint(address account, uint256 amount) internal override {
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        super._mint(account, amount);
    }

    /**
     * @dev Pauses the contract. Only callable by an account with ADMIN_ROLE.
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the contract. Only callable by an account with ADMIN_ROLE.
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Grants the ADMIN_ROLE to an account. Only callable by accounts with DEFAULT_ADMIN_ROLE.
     * @param account The address to grant the ADMIN_ROLE to.
     */
    function grantAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ADMIN_ROLE, account);
        emit AdminRoleGranted(account, msg.sender);
    }

    /**
     * @dev Revokes the ADMIN_ROLE from an account. Only callable by accounts with DEFAULT_ADMIN_ROLE.
     * @param account The address to revoke the ADMIN_ROLE from.
     */
    function revokeAdminRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ADMIN_ROLE, account);
        emit AdminRoleRevoked(account, msg.sender);
    }

    /**
     * @dev Emergency function to recover ERC20 tokens sent to this contract.
     * @param tokenAddress The address of the ERC20 token contract.
     * @param tokenAmount The amount of tokens to recover.
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyRole(ADMIN_ROLE) {
        IERC20Upgradeable(tokenAddress).transfer(msg.sender, tokenAmount);
    }

    /**
     * @dev Overridden to include pausable functionality in token transfers.
     * Prevents transfers while the contract is paused.
     * @param from The address transferring tokens.
     * @param to The address receiving tokens.
     * @param amount The amount of tokens being transferred.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

        if (paused()) revert TokenTransferWhilePaused();
    }

    /**
     * @dev Returns true if the contract supports the interface defined by interfaceId.
     * Required by the AccessControlUpgradeable contract.
     * @param interfaceId The interface identifier.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}