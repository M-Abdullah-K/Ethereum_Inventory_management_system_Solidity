const MultiWarehouseInventory = artifacts.require("MultiWarehouseInventory");
const assert = require("assert");
const Web3 = require("web3");

contract("MultiWarehouseInventory", (accounts) => {
  const [owner, staker1, staker2] = accounts;

  let instance;

  before(async () => {
    instance = await MultiWarehouseInventory.deployed();
  });

  it("should deploy the contract", async () => {
    assert(instance.address !== "", "Contract should be deployed");
  });

  it("should allow users to stake tokens", async () => {
    const stakeAmount = web3.utils.toWei("1", "ether");
    await instance.stakeTokens({ from: staker1, value: stakeAmount });
    const stakedAmount = await instance.stakes(staker1);
    assert.equal(
      stakedAmount.toString(),
      stakeAmount,
      "Staked amount should be recorded"
    );
  });

  it("should allow users to withdraw staked tokens", async () => {
    // Stake some tokens first
    const stakeAmount = web3.utils.toWei("1", "ether");
    await instance.stakeTokens({ from: staker1, value: stakeAmount });

    // Fetch initial balance of staker1
    const initialBalance = BigInt(await web3.eth.getBalance(staker1));

    // Perform the withdrawal
    const tx = await instance.withdrawStake({ from: staker1 });

    // Calculate gas cost
    const gasUsed = BigInt(tx.receipt.gasUsed);
    const txDetails = await web3.eth.getTransaction(tx.tx);
    const gasPrice = BigInt(txDetails.gasPrice);
    const gasCost = gasUsed * gasPrice;

    // Fetch final balance of staker1
    const finalBalance = BigInt(await web3.eth.getBalance(staker1));

    // Validate the staked amount in the contract
    const stakedAmount = await instance.stakes(staker1);
    assert.equal(stakedAmount.toString(), "0", "Staked amount should be zero");

    // Verify final balance (withdrawal amount minus gas cost)
    assert(
      finalBalance >= initialBalance - gasCost,
      "Final balance should account for gas cost and include withdrawn stake"
    );
  });

  it("should create a new inventory", async () => {
    await instance.createInventory("Warehouse A", { from: owner });
    const inventory = await instance.inventories(1);
    assert.equal(inventory.id.toString(), "1", "Inventory ID should be 1");
    assert.equal(
      inventory.name,
      "Warehouse A",
      "Inventory name should be 'Warehouse A'"
    );
  });

  it("should delete an inventory", async () => {
    await instance.deleteInventory(1, { from: owner });
    try {
      const inventory = await instance.inventories(1);
      assert.equal(
        inventory.id.toString(),
        "0",
        "Inventory should not exist after deletion"
      );
    } catch (error) {
      assert.fail("Error occurred while checking inventory deletion");
    }
  });

  it("should transfer ownership of the contract", async () => {
    await instance.transferOwnership(staker1, { from: owner });
    const newOwner = await instance.owner();
    assert.equal(
      newOwner,
      staker1,
      "Ownership should be transferred to staker1"
    );

    // Revert ownership back for further tests
    await instance.transferOwnership(owner, { from: staker1 });
    const revertedOwner = await instance.owner();
    assert.equal(
      revertedOwner,
      owner,
      "Ownership should revert back to the original owner"
    );
  });
});
