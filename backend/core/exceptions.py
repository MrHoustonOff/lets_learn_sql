class RollbackTransaction(Exception):
    """
    Exception raised to force a transaction rollback after executing read-only test queries.
    Used during query execution, explanations, and checks to ensure no state is mutated.
    """
    pass
