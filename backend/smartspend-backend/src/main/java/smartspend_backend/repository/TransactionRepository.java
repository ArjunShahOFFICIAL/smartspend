package smartspend_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import smartspend_backend.model.Transaction;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserAccountIdOrderByTransactionDateDesc(Long userId);
}