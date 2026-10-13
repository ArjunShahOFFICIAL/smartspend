package smartspend_backend.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import smartspend_backend.dto.DashboardSummary;
import smartspend_backend.model.Transaction;
import smartspend_backend.model.UserAccount;
import smartspend_backend.repository.TransactionRepository;
import smartspend_backend.repository.UserAccountRepository;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "${app.cors.allowed-origin:http://localhost:5173}")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final UserAccountRepository userAccountRepository;

    public TransactionController(
            TransactionRepository transactionRepository,
            UserAccountRepository userAccountRepository) {
        this.transactionRepository = transactionRepository;
        this.userAccountRepository = userAccountRepository;
    }

    @GetMapping
    public List<Transaction> getAllTransactions(
            @RequestHeader("X-User-Id") Long userId) {

        return transactionRepository
                .findByUserAccountIdOrderByTransactionDateDesc(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction addTransaction(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody Transaction transaction) {

        transaction.setUserAccount(findUser(userId));
        return transactionRepository.save(transaction);
    }

    @PutMapping("/{id}")
    public Transaction updateTransaction(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody Transaction updatedTransaction) {

        Transaction transaction = findTransaction(userId, id);

        transaction.setTitle(updatedTransaction.getTitle());
        transaction.setAmount(updatedTransaction.getAmount());
        transaction.setCategory(updatedTransaction.getCategory());
        transaction.setType(updatedTransaction.getType());
        transaction.setTransactionDate(updatedTransaction.getTransactionDate());
        transaction.setNotes(updatedTransaction.getNotes());

        return transactionRepository.save(transaction);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {

        transactionRepository.delete(findTransaction(userId, id));
    }

    @GetMapping("/summary")
    public DashboardSummary getDashboardSummary(
            @RequestHeader("X-User-Id") Long userId) {

        List<Transaction> transactions = transactionRepository
                .findByUserAccountIdOrderByTransactionDateDesc(userId);

        BigDecimal totalIncome = calculateTotal(transactions, "INCOME");
        BigDecimal totalExpense = calculateTotal(transactions, "EXPENSE");

        return new DashboardSummary(totalIncome, totalExpense);
    }

    private UserAccount findUser(Long userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "User account not found"));
    }

    private Transaction findTransaction(Long userId, Long id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Transaction not found"));

        if (transaction.getUserAccount() == null ||
                !transaction.getUserAccount().getId().equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Transaction not found");
        }

        return transaction;
    }

    private BigDecimal calculateTotal(List<Transaction> transactions, String type) {
        return transactions.stream()
                .filter(transaction -> type.equalsIgnoreCase(transaction.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}